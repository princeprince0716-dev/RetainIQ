import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, CheckCircle2, Pencil, Wrench } from 'lucide-react';
import { followupAggregate, RETENTION_FACTORS, savePlan, STRATEGIES, type Plan } from '@/lib/retention';
import { useRetention } from '@/hooks/use-retention-store';
import { PageHead, SourceBadge, SourceNote, fmt, followupResponses, isPredefined, signed } from '@/components/retention/ui';
import { PlanForm } from '@/components/retention/plan-form';

function PlanResult({ plan, onEdit, onMessage }: { plan: Plan; onEdit: () => void; onMessage: (m: string) => void }) {
  const { state, commit, setDepartment } = useRetention();
  const strategy = STRATEGIES.find((s) => s.id === plan.strategyId)!;
  const factor = RETENTION_FACTORS.find((f) => f.key === strategy.factor)!;
  const before = plan.baseline!.scores!;
  const follow = followupAggregate(state, plan);
  const after = follow.scores;
  const change = after ? after[factor.key] - before[factor.key] : 0;
  const met = after ? change >= plan.target : false;
  const generated = !isPredefined(plan.id) && followupResponses(state.responses, plan.id).some((r) => r.fictional);
  const collectHref = plan.source === 'submitted' ? `/employee-survey?plan=${plan.id}` : `/practice-tools?plan=${plan.id}`;
  const complete = () => {
    if (!window.confirm('Mark this plan Completed? No results are generated; Progress keeps showing only the follow-up responses already recorded.')) return;
    const err = commit((s) => savePlan(s, { ...plan, status: 'Completed' }));
    onMessage(err ?? 'Plan marked Completed.');
  };
  return <article className="card card-pad tracker-card" data-testid={`card-tracker-${plan.id}`}>
    <div className="card-head"><div><p className="eyebrow">{plan.department} · Concern: {factor.label}</p><h2>{strategy.title}</h2>
      <div className="plan-facts">
        <span><b>Responsible</b>{plan.responsible || '-'}</span><span><b>Review date</b>{plan.endDate}</span>
        <span><b>Status</b><span className={`status status-${plan.status.replace(' ', '-').toLowerCase()}`}>{plan.status}</span></span>
        <span><b>Baseline</b><span data-testid={`text-baseline-count-${plan.id}`}>{plan.baseline!.count} responses</span></span>
        <span><b>Follow-up</b><span data-testid={`text-followup-count-${plan.id}`}>{follow.count} responses</span></span>
        <span><b>Target</b>+{plan.target} points</span>
      </div></div>
      <div className="toolbar" style={{ justifyContent: 'flex-end' }}><SourceBadge source={plan.source} />{isPredefined(plan.id) && <span className="tag-predef">Example plan</span>}{generated && <span className="tag-generated" data-testid={`tag-generated-${plan.id}`}>Fictional generated follow-up</span>}</div></div>
    <div className="table-wrap"><table className="data-table compare"><thead><tr><th>Factor</th><th>Before</th><th>After</th><th>Change</th></tr></thead><tbody>
      {RETENTION_FACTORS.map((f) => { const d = after ? after[f.key] - before[f.key] : null; const focus = f.key === factor.key; return <tr key={f.key} className={focus ? 'focus-row' : ''} data-testid={`row-compare-${plan.id}-${f.key}`}>
        <td>{f.label}{focus && <span className="tag-focus">Plan focus</span>}</td><td className="mono">{fmt(before[f.key])}</td><td className="mono">{after ? fmt(after[f.key]) : <span className="subtle">Hidden</span>}</td>
        <td className={`mono ${d && d > 0 ? 'pos' : d && d < 0 ? 'neg' : ''}`}>{d === null ? '-' : signed(d)}</td></tr>; })}
    </tbody></table></div>
    {after ? <p className="conclusion" data-testid={`text-interpretation-${plan.id}`}><span className={`status ${met ? 'status-completed' : 'status-miss'}`} data-testid={`status-target-${plan.id}`}>{met ? 'Target reached' : 'Target not reached'}</span> {factor.label} moved {signed(change)} points against a +{plan.target} target. Intention to stay moved {signed(after.stay - before.stay)}; that is a change in stated intention, not in actual retention.</p>
      : <p className="small-copy" style={{ marginTop: 10 }} data-testid={`text-followup-hidden-${plan.id}`}>Follow-up results hidden: {follow.count} of 10 responses. {plan.source === 'demo' ? 'Example-data plans get fictional follow-ups from Practice Tools.' : 'Share the employee survey link to collect follow-ups.'}</p>}
    <div className="toolbar" style={{ marginTop: 12 }}>
      {!isPredefined(plan.id) && plan.status !== 'Completed' && !after && <Link href={collectHref} className="btn btn-primary btn-small" data-testid={`link-followup-${plan.id}`}>{plan.source === 'demo' ? <><Wrench size={12} />Load fictional follow-up</> : <>Collect follow-up <ArrowRight size={12} /></>}</Link>}
      {after && <Link href="/results" onClick={() => setDepartment(plan.department)} className="btn btn-small" data-testid={`link-review-${plan.id}`}>Review department results</Link>}
      {plan.status !== 'Completed' && <button className="btn btn-small" onClick={onEdit} data-testid={`button-edit-${plan.id}`}><Pencil size={12} />Edit plan</button>}
      {plan.status === 'In Progress' && <button className={`btn btn-small ${after ? 'btn-primary' : ''}`} onClick={complete} data-testid={`button-complete-${plan.id}`}><CheckCircle2 size={12} />Complete plan</button>}
    </div>
    <p className="caveat">Before-and-after changes do not prove the action caused the difference. Staffing, seasons, and who responded can all shift scores.</p>
  </article>;
}

export default function TrackerPage() {
  const { state, source } = useRetention();
  const [editing, setEditing] = useState<Plan | null>(null);
  const [message, setMessage] = useState('');
  const plans = state.plans.filter((p) => p.source === source);
  const started = plans.filter((p) => p.baseline?.scores);
  const planned = plans.filter((p) => !p.baseline);
  return <>
    <PageHead eyebrow="Progress" title="Did conditions change?" description="Baseline scores captured when a plan started, compared with follow-up responses for the same department.">
      <Link href="/practice-tools" className="btn btn-small" data-testid="link-practice-tools"><Wrench size={13} />Practice Tools</Link>
    </PageHead>
    <SourceNote source={source} />
    {message && <p className="success-msg banner-ok" role="status" style={{ marginBottom: 14 }} data-testid="text-progress-message">{message}</p>}
    {started.length === 0 ? <div className="empty-state">No started plans in this data mode. Start one from <Link href="/action-plans" className="inline-link">Action Plans</Link>.</div>
      : <div className="grid">{started.map((p) => <PlanResult key={p.id} plan={p} onEdit={() => setEditing(p)} onMessage={setMessage} />)}</div>}
    {planned.length > 0 && <section className="card card-pad section-gap"><h3>Planned, not yet started</h3><div className="department-list">{planned.map((p) => <div className="department-row" key={p.id}><span className="dept-name">{p.department}</span><span className="subtle">{STRATEGIES.find((s) => s.id === p.strategyId)?.title}</span><button className="btn btn-small" style={{ justifySelf: 'end' }} onClick={() => setEditing(p)} data-testid={`button-start-${p.id}`}>Review and start</button></div>)}</div></section>}
    {editing && <PlanForm key={editing.id} initial={editing} isNew={false} onClose={() => setEditing(null)} onSaved={(m) => { setMessage(m); setEditing(null); }} />}
  </>;
}
