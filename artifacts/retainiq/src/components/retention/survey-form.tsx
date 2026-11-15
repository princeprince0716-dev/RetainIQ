import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearch } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { addResponse, RETENTION_DEPARTMENTS, RETENTION_FACTORS, STRATEGIES, type RetentionFactor, type Scores } from '@/lib/retention';
import { useRetention } from '@/hooks/use-retention-store';
import { slug } from './ui';

const empty = (): Record<RetentionFactor, number | null> => ({ satisfaction: null, workload: null, support: null, career: null, stay: null });
const scale = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'];

/** Shared survey. Always saves to Practice submissions (internal source 'submitted'); never changes the HR data mode. */
export function SurveyForm() {
  const { state, commit, department: savedDepartment, setDepartment: rememberDepartment } = useRetention();
  const search = useSearch();
  const [department, setDepartment] = useState(savedDepartment);
  const [planId, setPlanId] = useState('');
  const [answers, setAnswers] = useState(empty);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [linkNote, setLinkNote] = useState('');

  const followupPlans = useMemo(() => state.plans.filter((p) => p.source === 'submitted' && p.baseline && p.startedAt && p.status !== 'Completed'), [state.plans]);
  useEffect(() => {
    const id = new URLSearchParams(search).get('plan');
    if (!id) { setPlanId(''); setLinkNote(''); return; }
    const plan = followupPlans.find((p) => p.id === id);
    if (plan) { setPlanId(plan.id); setDepartment(plan.department); rememberDepartment(plan.department); setLinkNote(''); }
    else { setPlanId(''); setLinkNote('This follow-up link is not for an active practice plan, so this survey is a general baseline response.'); }
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const plan = followupPlans.find((p) => p.id === planId);
  const strategy = plan ? STRATEGIES.find((s) => s.id === plan.strategyId) : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!department || RETENTION_FACTORS.some((f) => answers[f.key] === null)) { setError('Choose a department and answer all five questions.'); setMessage(''); return; }
    const response = { id: crypto.randomUUID(), department, answers: answers as Scores, createdAt: new Date().toISOString(), source: 'submitted' as const, ...(plan ? { planId: plan.id } : {}) };
    const err = commit((s) => addResponse(s, response));
    if (err) { setError(err); setMessage(''); return; }
    const n = plan
      ? state.responses.filter((r) => r.planId === plan.id).length + 1
      : state.responses.filter((r) => r.department === department && !r.planId && (r.source ?? 'submitted') === 'submitted').length + 1;
    const more = Math.max(0, 10 - n);
    setMessage(`Thank you. Your response was saved. ${plan ? `This follow-up for ${department}` : department} now has ${n} response${n === 1 ? '' : 's'}; ${more > 0 ? `${more} more needed before results can be shown.` : 'results can now be shown as averages.'}`);
    setError(''); setAnswers(empty());
  };

  return <form onSubmit={submit} data-testid="form-survey">
    <fieldset className="department-choices">
      <legend>Choose your department</legend>
      <div className="department-choice-grid" data-testid="select-survey-department">
        {RETENTION_DEPARTMENTS.map((d) => <label key={d} className={`department-choice ${department === d ? 'is-selected' : ''}`}>
          <input type="radio" name="survey-department" value={d} checked={department === d} onChange={() => {
            setDepartment(d); rememberDepartment(d); setError(''); setMessage('');
            if (plan && d !== plan.department) { setPlanId(''); setMessage('Department changed, so this is now a general baseline response rather than a follow-up.'); }
          }} data-testid={`radio-department-${slug(d)}`} />
          <span>{d}</span></label>)}
      </div>
      <p className="small-copy" aria-live="polite">{department ? `Selected department: ${department}` : 'Select one department to continue.'}</p>
    </fieldset>
    {followupPlans.length > 0 && <div className="field section-gap"><label htmlFor="survey-round">Survey round</label>
      <select id="survey-round" className="select" value={planId} onChange={(e) => { const p = followupPlans.find((x) => x.id === e.target.value); setPlanId(e.target.value); if (p) { setDepartment(p.department); rememberDepartment(p.department); } }} data-testid="select-survey-round">
        <option value="">General survey (baseline)</option>
        {followupPlans.map((p, i) => <option key={p.id} value={p.id}>Follow-up {i + 1}: {p.department} · {p.responsible} · Review {p.endDate} · {STRATEGIES.find((s) => s.id === p.strategyId)?.title}</option>)}
      </select></div>}
    {linkNote && <p className="small-copy" style={{ marginTop: 10 }} data-testid="text-link-note">{linkNote}</p>}
    {plan && <div className="followup-context section-gap" data-testid="text-followup-context">
      <p className="mini-label">Follow-up survey</p>
      <strong>{plan.department}</strong>
      <span>Action being reviewed: {strategy?.title}</span>
      <span className="small-copy">Responsible role: {plan.responsible}</span>
      <span className="small-copy">Started {plan.startedAt?.slice(0, 10)} · review date {plan.endDate}. Answer about the past few weeks.</span>
    </div>}
    {RETENTION_FACTORS.map((f, i) => <fieldset className="survey-question" key={f.key}>
      <legend className="question-title"><span className="q-num">0{i + 1}</span>{f.question}</legend>
      <div className="likert">{[1, 2, 3, 4, 5].map((v) => <label className="likert-label" key={v} title={scale[v - 1]}>
        <input type="radio" name={f.key} checked={answers[f.key] === v} onChange={() => setAnswers((a) => ({ ...a, [f.key]: v }))} data-testid={`input-rating-${f.key}-${v}`} /><span>{v}</span></label>)}</div>
      <div className="likert-ends"><span>Strongly disagree</span><span>Strongly agree</span></div>
    </fieldset>)}
    {error && <p className="inline-error" role="alert" data-testid="text-survey-error">{error}</p>}
    {message && <p className="success-msg banner-ok" role="status" data-testid="text-survey-success">{message}</p>}
    <div className="toolbar section-gap"><button className="btn btn-primary" type="submit" data-testid="button-submit-survey">Submit response <ArrowRight size={14} /></button><span className="small-copy">Saved in this browser only. No names collected.</span></div>
  </form>;
}
