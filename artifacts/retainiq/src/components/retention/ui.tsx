import type { ReactNode } from 'react';
import { AlertTriangle, Database, FlaskConical } from 'lucide-react';
import { RETENTION_DEPARTMENTS, RETENTION_FACTORS, type Response, type Source } from '@/lib/retention';
import { useRetention } from '@/hooks/use-retention-store';

export const fmt = (n: number) => (Math.round(n * 10) / 10).toString();
export const signed = (n: number) => `${n > 0 ? '+' : ''}${fmt(n)}`;
export const isPredefined = (id: string) => id === 'demo-nursing' || id === 'demo-emergency';
export const sourceName = (s: Source) => (s === 'demo' ? 'Example data' : 'Practice submissions');
export const factorLabel = (k: string) => RETENTION_FACTORS.find((f) => f.key === k)?.label ?? k;
export const slug = (s: string) => s.toLowerCase().replaceAll(' ', '-');
export const followupResponses = (responses: Response[], planId: string) => responses.filter((r) => r.planId === planId);

export function PageHead({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <div className="page-head"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="lede">{description}</p></div>{children && <div className="toolbar">{children}</div>}</div>;
}

/** The single, app-wide mode selector. Lives in the HR shell only. */
export function ModeSelector() {
  const { source, setSource } = useRetention();
  return <div className="mode-selector" role="radiogroup" aria-label="Data mode">
    <span className="source-label">Data mode</span>
    <div className="seg">
      <button type="button" role="radio" aria-checked={source === 'demo'} className={source === 'demo' ? 'on' : ''} onClick={() => setSource('demo')} data-testid="toggle-source-demo"><FlaskConical size={13} />Example data</button>
      <button type="button" role="radio" aria-checked={source === 'submitted'} className={source === 'submitted' ? 'on' : ''} onClick={() => setSource('submitted')} data-testid="toggle-source-submitted"><Database size={13} />Practice submissions</button>
    </div>
  </div>;
}

export function SourceBadge({ source }: { source: Source }) {
  return <span className={`source-badge ${source}`} data-testid={`badge-source-${source}`}>{sourceName(source)}</span>;
}

export function SourceNote({ source }: { source: Source }) {
  return <p className="source-note" data-testid="text-source-note">{source === 'demo'
    ? 'Example data: fixed, fictional responses (20 per department). Never mixed with practice submissions.'
    : 'Practice submissions: survey responses saved in this browser only, including any fictional records loaded from Practice Tools. They cannot be collected from other devices.'}</p>;
}

export function DeptChips({ value, onChange, counts }: { value: string; onChange: (d: string) => void; counts?: Record<string, number> }) {
  return <div className="dept-chips" role="radiogroup" aria-label="Department">
    {RETENTION_DEPARTMENTS.map((d) => <button type="button" role="radio" aria-checked={value === d} key={d} className={`dept-chip ${value === d ? 'on' : ''}`} onClick={() => onChange(d)} data-testid={`chip-department-${slug(d)}`}>
      {d}{counts && <small>{counts[d] ?? 0}</small>}</button>)}
  </div>;
}

export function ScoreBar({ label, score, emphasis = false, testId }: { label: string; score: number; emphasis?: boolean; testId?: string }) {
  return <div className={`score-bar ${emphasis ? 'emph' : ''}`} data-testid={testId}>
    <span className="score-label">{label}</span>
    <span className="score-track"><span className="score-fill" style={{ transform: `scaleX(${Math.max(0, Math.min(100, score)) / 100})` }} /></span>
    <span className="score-num">{fmt(score)}<small>/100</small></span>
  </div>;
}

export function Suppressed({ count, what = 'results' }: { count: number; what?: string }) {
  return <div className="suppressed" data-testid="status-suppressed"><strong>{count} of 10 responses</strong><span>{what[0].toUpperCase() + what.slice(1)} stay hidden until at least 10 responses protect anonymity{count < 10 ? ` (${10 - count} more needed)` : ''}.</span></div>;
}

export function StorageBanner() {
  const { loadError, discardAndStartFresh } = useRetention();
  if (!loadError) return null;
  return <div className="storage-banner" role="alert" data-testid="banner-storage-error">
    <AlertTriangle size={17} />
    <div><strong>Storage problem.</strong> {loadError}</div>
    {loadError.includes('could not be read') && <button className="btn btn-small btn-danger" onClick={() => {
      if (window.confirm('Discard the unreadable survey and plan data stored under retainiq-retention-v1 and start fresh? Legacy testing records are not affected.')) {
        const err = discardAndStartFresh(); if (err) window.alert(err);
      }
    }} data-testid="button-discard-malformed">Discard and start fresh</button>}
  </div>;
}
