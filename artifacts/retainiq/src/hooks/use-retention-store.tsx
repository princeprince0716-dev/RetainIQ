import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { initialRetentionState, isRetentionState, RETENTION_DEPARTMENTS, type RetentionState, type Source } from '@/lib/retention';

export const RETENTION_STORAGE_KEY = 'retainiq-retention-v1';
export const PREFS_STORAGE_KEY = 'retainiq-prefs-v1';

type LoadResult = { state: RetentionState; error: string | null; blocked: boolean };
export type PracticeMeta = { organizationScenario: string | null; loadedAt: string | null };
type Prefs = { source: Source; department: string; practice: PracticeMeta };

const defaultPrefs = (): Prefs => ({ source: 'demo', department: 'Nursing', practice: { organizationScenario: null, loadedAt: null } });

function loadPrefs(): Prefs {
  const base = defaultPrefs();
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return base;
    const p = JSON.parse(raw) as Partial<Prefs>;
    return {
      source: p.source === 'submitted' ? 'submitted' : 'demo',
      department: typeof p.department === 'string' && RETENTION_DEPARTMENTS.includes(p.department) ? p.department : base.department,
      practice: p.practice && typeof p.practice === 'object'
        ? { organizationScenario: typeof p.practice.organizationScenario === 'string' ? p.practice.organizationScenario : null, loadedAt: typeof p.practice.loadedAt === 'string' ? p.practice.loadedAt : null }
        : base.practice,
    };
  } catch { return base; }
}

function loadState(): LoadResult {
  let raw: string | null;
  try { raw = localStorage.getItem(RETENTION_STORAGE_KEY); } catch {
    return { state: initialRetentionState(), error: 'Browser storage is unavailable, so changes cannot be saved in this session. Example data is still viewable.', blocked: true };
  }
  if (raw === null) return { state: initialRetentionState(), error: null, blocked: false };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isRetentionState(parsed)) return { state: parsed, error: null, blocked: false };
  } catch { /* handled below */ }
  return { state: initialRetentionState(), error: 'Saved RetainIQ survey and plan data in this browser could not be read. It has not been changed or overwritten. Saving is paused until you choose to discard it.', blocked: true };
}

type Ctx = {
  state: RetentionState;
  source: Source;
  setSource: (s: Source) => void;
  department: string;
  setDepartment: (d: string) => void;
  practiceMeta: PracticeMeta;
  setPracticeMeta: (m: PracticeMeta) => void;
  loadError: string | null;
  blocked: boolean;
  /** Applies a change, persists it, and only then updates the UI. Returns an error message or null. */
  commit: (fn: (s: RetentionState) => RetentionState) => string | null;
  discardAndStartFresh: () => string | null;
};

const RetentionContext = createContext<Ctx | null>(null);

export function RetentionProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadState);
  const [state, setState] = useState(initial.state);
  const [loadError, setLoadError] = useState(initial.error);
  const [blocked, setBlocked] = useState(initial.blocked);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const stateRef = useRef(state);

  const updatePrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next)); } catch { /* preference only */ }
      return next;
    });
  }, []);
  const setSource = useCallback((source: Source) => updatePrefs({ source }), [updatePrefs]);
  const setDepartment = useCallback((department: string) => { if (RETENTION_DEPARTMENTS.includes(department)) updatePrefs({ department }); }, [updatePrefs]);
  const setPracticeMeta = useCallback((practice: PracticeMeta) => updatePrefs({ practice }), [updatePrefs]);

  const persist = (next: RetentionState): string | null => {
    try { localStorage.setItem(RETENTION_STORAGE_KEY, JSON.stringify(next)); } catch {
      return 'This change could not be saved to browser storage, so nothing was changed.';
    }
    stateRef.current = next;
    setState(next);
    return null;
  };

  const commit = useCallback((fn: (s: RetentionState) => RetentionState) => {
    if (blocked) return 'Saving is paused because stored data could not be read or storage is unavailable. See the notice at the top of the page.';
    let next: RetentionState;
    try { next = fn(stateRef.current); } catch (e) { return e instanceof Error ? e.message : 'This change could not be applied.'; }
    return persist(next);
  }, [blocked]);

  const discardAndStartFresh = () => {
    const err = persist(initialRetentionState());
    if (!err) { setBlocked(false); setLoadError(null); }
    return err;
  };

  return <RetentionContext.Provider value={{ state, source: prefs.source, setSource, department: prefs.department, setDepartment, practiceMeta: prefs.practice, setPracticeMeta, loadError, blocked, commit, discardAndStartFresh }}>{children}</RetentionContext.Provider>;
}

export function useRetention() {
  const ctx = useContext(RetentionContext);
  if (!ctx) throw new Error('useRetention must be used inside RetentionProvider');
  return ctx;
}
