import { useState } from 'react';
import { Lock, Play, Save, X } from 'lucide-react';
import { departmentAggregate, RETENTION_FACTORS, savePlan, STRATEGIES, type Plan, type PlanStatus, type Source } from '@/lib/retention';
import { useRetention } from '@/hooks/use-retention-store';
import { sourceName } from './ui';
import { addDays } from './healthcare';

export function PlanForm({ initial, isNew, onClose, onSaved }: { initial: Plan; isNew: boolean; onClose: () => void; onSaved: (msg: string) => void }) {
  const { state, commit } = useRetention();
  const [draft, setDraft] = useState<Plan>(initial);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const locked = !!initial.baseline;
  const strategy = STRATEGIES.find((s) => s.id === draft.strategyId);
  const factor = RETENTION_FACTORS.find((f) => f.key === strategy?.factor);
  const set = <K extends keyof Plan>(k: K, v: Plan[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const available = departmentAggregate(state, draft.department, draft.source).count;

  const save = (status: PlanStatus) => {
    if (status === 'In Progress' && !locked && !confirmed) { setError('Confirm that you have discussed this concern with staff before starting the plan.'); return; }
    const err = commit((s) => savePlan(s, { ...draft, status, responsible: draft.responsible.trim() }));
    if (err) { setError(err); return; }
    onSaved(!locked && status === 'In Progress' ? `Plan started. Baseline captured from ${available} ${sourceName(draft.source).toLowerCase()} responses for ${draft.department} and locked.` : isNew ? 'Plan saved as Planned. Start it when staff have confirmed the concern.' : 'Plan updated.');
  };

  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={isNew ? 'Create action plan' : 'Edit action plan'} onClick={onClose}>
    <form className="modal card" onSubmit={(e) => { e.preventDefault(); save(locked ? draft.status : 'In Progress'); }} onClick={(e) => e.stopPropagation()}>
      <div className="card-head"><div><p className="eyebrow">{isNew ? 'New action plan' : 'Edit action plan'}</p><h2>{strategy?.title}</h2></div>
        <button type="button" className="btn btn-small" onClick={onClose} aria-label="Close" data-testid="button-close-plan"><X size={14} /></button></div>
      <dl className="carry" data-testid="text-plan-carry">
        <div><dt>Department</dt><dd>{draft.department}</dd></div>
        <div><dt>Data mode</dt><dd>{sourceName(draft.source)}</dd></div>
        <div><dt>Concern</dt><dd>{factor?.label}</dd></div>
      </dl>
      {locked && <div className="callout" style={{ marginBottom: 14 }}><Lock size={12} /> Baseline captured {initial.startedAt?.slice(0, 10)} ({initial.baseline?.count} responses). Department, data mode, and strategy are locked so the comparison stays fair.</div>}
      <div className="form-grid">
        <div className="field form-full"><label htmlFor="plan-owner">Responsible role</label>
          <input id="plan-owner" className="input" value={draft.responsible} onChange={(e) => set('responsible', e.target.value)} placeholder="e.g. Nurse manager, 4 West" data-testid="input-plan-responsible" /></div>
        <div className="field"><label htmlFor="plan-end">Review date</label><input id="plan-end" type="date" className="input" value={draft.endDate} onChange={(e) => set('endDate', e.target.value)} data-testid="input-plan-end" /></div>
        <div className="field"><label htmlFor="plan-target">Target improvement (points)</label><input id="plan-target" type="number" min={1} max={100} className="input" value={Number.isFinite(draft.target) ? draft.target : ''} onChange={(e) => set('target', e.target.value === '' ? NaN : Number(e.target.value))} data-testid="input-plan-target" />
          <span className="small-copy">10 points is a suggested practice goal, not a benchmark.</span></div>
        <div className="field"><label htmlFor="plan-start">Start date</label><input id="plan-start" type="date" className="input" value={draft.startDate} onChange={(e) => set('startDate', e.target.value)} data-testid="input-plan-start" /></div>
        {locked && <div className="field"><label htmlFor="plan-status">Status</label>
          <select id="plan-status" className="select" value={draft.status} onChange={(e) => set('status', e.target.value as PlanStatus)} data-testid="select-plan-status">
            <option>In Progress</option><option>Completed</option></select></div>}
      </div>
      {!locked && <>
        <label className="confirm-check" data-testid="label-confirm-staff">
          <input type="checkbox" checked={confirmed} onChange={(e) => { setConfirmed(e.target.checked); setError(''); }} data-testid="checkbox-confirm-staff" />
          <span>I have discussed <strong>{factor?.label.toLowerCase()}</strong> with {draft.department} staff and they agree it is worth acting on. A low score is a prompt to ask, not proof of a problem.</span>
        </label>
        <p className="small-copy" style={{ marginTop: 10 }}>Start plan captures the baseline from {sourceName(draft.source).toLowerCase()} for {draft.department} ({available} available, 10 required). It cannot be changed afterwards.</p>
      </>}
      {locked && draft.status === 'Completed' && <p className="small-copy" style={{ marginTop: 12 }}>Completing a plan does not create any results. Only follow-up responses change Progress.</p>}
      {error && <p className="inline-error" role="alert" style={{ marginTop: 10 }} data-testid="text-plan-error">{error}</p>}
      <div className="toolbar section-gap">
        {locked ? <button className="btn btn-primary" type="submit" data-testid="button-save-plan"><Save size={13} />Save changes</button> : <>
          <button className="btn btn-primary" type="submit" disabled={!confirmed} data-testid="button-start-plan"><Play size={13} />Start plan</button>
          <button className="btn" type="button" onClick={() => save('Planned')} data-testid="button-save-planned">Save as Planned</button></>}
        <button type="button" className="btn" onClick={onClose} data-testid="button-cancel-plan">Cancel</button>
      </div>
    </form>
  </div>;
}

export function newPlanDraft(department: string, strategyId: string, source: Source, target = 10): Plan {
  const days = STRATEGIES.find((s) => s.id === strategyId)?.days ?? 30;
  const start = new Date();
  return { id: crypto.randomUUID(), department, strategyId, responsible: '', startDate: start.toISOString().slice(0, 10), endDate: addDays(days, start), target, status: 'Planned', source, baseline: null, startedAt: null };
}
