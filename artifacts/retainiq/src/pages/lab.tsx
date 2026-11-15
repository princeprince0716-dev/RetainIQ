import { useEffect, useState } from 'react';
import { Link, useSearch } from 'wouter';
import { ArrowRight, Pencil, Plus } from 'lucide-react';
import { departmentAggregate, recommend, STRATEGIES, type Plan, type Strategy } from '@/lib/retention';
import { useRetention } from '@/hooks/use-retention-store';
import { DeptChips, PageHead, SourceBadge, SourceNote, Suppressed, factorLabel, fmt, isPredefined } from '@/components/retention/ui';
import { newPlanDraft, PlanForm } from '@/components/retention/plan-form';
import { HEALTHCARE_STEPS } from '@/components/retention/healthcare';

function OptionCard({ s, label, primary, score, onSelect }: { s: Strategy; label: string; primary?: boolean; score?: number; onSelect: (target: number) => void }) {
  const [target, setTarget] = useState('10');
  const t = Number(target);
  const valid = Number.isFinite(t) && t >= 1 && t <= 100;
  return <article className={`card strategy-card ${primary ? 'primary-option' : ''}`} data-testid={`card-strategy-${s.id}`}>
    <div className="strategy-letter">{label}</div>
    <div>
      <p className="eyebrow">{primary ? 'Suggested action' : 'Alternative'} · Concern: {factorLabel(s.factor).toLowerCase()}{score !== undefined ? ` (${fmt(score)}/100)` : ''}</p>
      <h3 className="strategy-title">{s.title}</h3>
      <ol className="steps">{(HEALTHCARE_STEPS[s.id] ?? s.steps).map((st) => <li key={st}>{st}</li>)}</ol>
      <div className="strategy-meta"><span><b>{s.days} days</b> suggested duration</span>
        <label className="target-inline">Target <input type="number" min={1} max={100} className="input" value={target} onChange={(e) => setTarget(e.target.value)} data-testid={`input-target-${s.id}`} /> points</label>
        <span className="subtle">10 is a suggested practice goal</span></div>
      <details className="why"><summary data-testid={`toggle-why-${s.id}`}>Why this might help</summary><p>{s.rationale}</p></details>
      <button className="btn btn-primary btn-small" disabled={!valid} onClick={() => onSelect(t)} data-testid={`button-select-${s.id}`}><Plus size={13} />Plan this action</button>
      {!valid && <span className="inline-error" style={{ marginLeft: 10 }}>Target must be 1 to 100.</span>}
    </div>
  </article>;
}

export default function LabPage() {
  const { state, source, department, setDepartment } = useRetention();
  const search = useSearch();
  const [editing, setEditing] = useState<{ plan: Plan; isNew: boolean } | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const plan = state.plans.find((x) => x.id === new URLSearchParams(search).get('edit'));
    if (plan && plan.source === source) setEditing({ plan, isNew: false });
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const agg = departmentAggregate(state, department, source);
  const recs = agg.scores ? recommend(agg.scores).filter((s, i, a) => s && a.indexOf(s) === i).slice(0, 3) : [];
  const plans = state.plans.filter((p) => p.source === source);
  const open = (strategyId: string, target: number) => setEditing({ plan: newPlanDraft(department, strategyId, source, target), isNew: true });

  return <>
    <PageHead eyebrow="Action Plans" title="Choose one practical action." description="Suggestions are matched to the department's lowest-rated factors by simple rules. They are starting points to discuss with staff, not proven treatments." />
    <SourceNote source={source} />
    <DeptChips value={department} onChange={setDepartment} />
    {message && <p className="success-msg banner-ok section-gap" role="status" data-testid="text-lab-message">{message} <Link href="/progress" className="inline-link">Open Progress</Link></p>}

    <section className="section-gap">
      <div className="section-title"><h2>Options for {department}</h2><SourceBadge source={source} /></div>
      {!agg.scores ? <div className="card card-pad"><Suppressed count={agg.count} what="suggestions" />{source === 'submitted' && <p className="small-copy" style={{ marginTop: 10 }}>Collect more responses in the <Link href="/survey" className="inline-link">Survey</Link>, or load a fictional organization in <Link href="/practice-tools" className="inline-link">Practice Tools</Link>.</p>}</div>
        : <div className="strategy-list">{recs.map((s, i) => <OptionCard key={s.id} s={s} label={i === 0 ? '1' : String.fromCharCode(64 + i)} primary={i === 0} score={agg.scores![s.factor]} onSelect={(t) => open(s.id, t)} />)}</div>}
    </section>

    <section className="card card-pad section-gap">
      <div className="card-head"><div><h2>Your action plans</h2><p className="card-note">All departments in this data mode. Starting a plan locks its baseline.</p></div><SourceBadge source={source} /></div>
      {plans.length === 0 ? <div className="empty-state">No plans yet in {source === 'demo' ? 'Example data' : 'Practice submissions'}. Choose an option above.</div>
        : <div className="table-wrap"><table className="data-table"><thead><tr><th>Department</th><th>Action</th><th>Responsible</th><th>Review date</th><th>Target</th><th>Status</th><th></th></tr></thead><tbody>
          {plans.map((p) => <tr key={p.id} data-testid={`row-plan-${p.id}`}>
            <td>{p.department}{isPredefined(p.id) && <span className="tag-predef">Example</span>}</td>
            <td>{STRATEGIES.find((s) => s.id === p.strategyId)?.title}</td><td>{p.responsible}</td>
            <td className="mono">{p.endDate}</td><td className="mono">+{p.target}</td>
            <td><span className={`status status-${p.status.replace(' ', '-').toLowerCase()}`} data-testid={`status-plan-${p.id}`}>{p.status}</span></td>
            <td><button className="btn btn-small" onClick={() => setEditing({ plan: p, isNew: false })} data-testid={`button-edit-plan-${p.id}`}><Pencil size={12} />{p.status === 'Planned' ? 'Edit or start' : 'Edit'}</button></td>
          </tr>)}</tbody></table></div>}
    </section>
    {editing && <PlanForm key={editing.plan.id} initial={editing.plan} isNew={editing.isNew} onClose={() => setEditing(null)} onSaved={(m) => { setMessage(m); setEditing(null); }} />}
    <p className="small-copy section-gap">More on the theory: <Link href="/methodology" className="inline-link">Methodology &amp; Privacy <ArrowRight size={11} /></Link></p>
  </>;
}
