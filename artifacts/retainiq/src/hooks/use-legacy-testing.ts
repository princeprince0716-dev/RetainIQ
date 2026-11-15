import { useState } from 'react';
import type { PeerEntry, TaskEntry } from '@/lib/demo-store';

/** Legacy key: also holds older survey records, which are always preserved untouched. */
const LEGACY_KEY = 'retainiq-demo-v1';

type Loaded = { tasks: TaskEntry[]; reviews: PeerEntry[]; error: string | null };

function readRecord(): { record: Record<string, unknown> } | { error: string } {
  let raw: string | null;
  try { raw = localStorage.getItem(LEGACY_KEY); } catch { return { error: 'Browser storage is unavailable; testing records cannot be saved.' }; }
  if (raw === null) return { record: {} };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return { record: parsed as Record<string, unknown> };
  } catch { /* fall through */ }
  return { error: 'Saved testing records could not be read. They have not been changed; saving is paused to avoid overwriting them.' };
}

function load(): Loaded {
  const r = readRecord();
  if ('error' in r) return { tasks: [], reviews: [], error: r.error };
  return {
    tasks: Array.isArray(r.record.tasks) ? r.record.tasks as TaskEntry[] : [],
    reviews: Array.isArray(r.record.reviews) ? r.record.reviews as PeerEntry[] : [],
    error: null,
  };
}

export function useLegacyTesting() {
  const [data, setData] = useState(load);
  /** Merges into the existing legacy record so older survey entries are never removed. Persists before updating UI. */
  const save = (next: { tasks: TaskEntry[]; reviews: PeerEntry[] }): string | null => {
    if (data.error) return data.error;
    const current = readRecord();
    if ('error' in current) return current.error;
    try { localStorage.setItem(LEGACY_KEY, JSON.stringify({ ...current.record, tasks: next.tasks, reviews: next.reviews })); } catch {
      return 'Could not save to browser storage. Nothing was changed.';
    }
    setData({ ...next, error: null });
    return null;
  };
  return { tasks: data.tasks, reviews: data.reviews, error: data.error, save };
}
