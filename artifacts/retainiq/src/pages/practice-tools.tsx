import { useEffect, useState } from 'react';
import { Link, useSearch } from 'wouter';
import { Building2, RotateCcw, Wand2 } from 'lucide-react';
import { RETENTION_DEPARTMENTS, STRATEGIES } from '@/lib/retention';
import { HEADCOUNTS, loadPracticeFollowup, loadPracticeOrganization, ORGANIZATION_HEADCOUNT, PRACTICE_SCENARIOS, resetPractice, type PracticeScenario } from '@/lib/practice';
import { useRetention } from '@/hooks/use-retention-store';
import { PageHead, isPredefined, slug, sourceName } from '@/components/retention/ui';

function ScenarioPicker({ value, onChange, name }: { value: PracticeScenario; onChange: (s: PracticeScenario) => void; name: string }) {
  return <div className="department-choice-grid" role="radiogroup">
    {PRACTICE_SCENARIOS.map((s) => <label key={s.key} className={`department-choice ${value === s.key ? 'is-selected' : ''}`}>
      <input type="radio" name={name} checked={value === s.key} onChange={() => onChange(s.key)} data-testid={`radio-${name}-${s.key}`} /><span>{s.label}</span></label>)}
  </div>;
}

export default function PracticeToolsPage() {
  const { state, commit, practiceMeta, setPracticeMeta, setSource } = useRetention();
  const search = useSearch();
  const [orgScenario, setOrgScenario] = useState<PracticeScenario>(() => PRACTICE_SCENARIOS.find(s => s.key === practiceMeta.organizationScenario)?.key ?? 'improvement');
  const [fuScenario, setFuScenario] = useState<PracticeScenario>('improvement');
  const [planId, setPlanId] = useState('');
  const [orgMsg, setOrgMsg] = useState('');
  const [fuMsg, setFuMsg] = useState('');

  const practiceResponses = state.responses.filter((r) => (r.source ?? 'submitted') === 'submitted');
  const practicePlans = state.plans.filter((p) => p.source === 'submitted');
  const startedPlans = state.plans.filter((p) => p.baseline?.scores && p.startedAt && !isPredefined(p.id));
  const perDept = orgScenario === 'small' ? 9 : 20;

  useEffect(() => {
    const id = new URLSearchParams(search).get('plan');
    if (id && startedPlans.some((p) => p.id === id)) setPlanId(id);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const scope = `${practiceResponses.length} practice survey response${practiceResponses.length === 1 ? '' : 's'} and ${practicePlans.length} practice plan${practicePlans.length === 1 ? '' : 's'}`;
  const loadOrg = () => {
    if ((practiceResponses.length || practicePlans.length) && !window.confirm(`Loading replaces all current Practice submissions: ${scope} will be removed. Example data, example-mode plans, and testing records are kept. Continue?`)) return;
    const err = commit((s) => loadPracticeOrganization(s, orgScenario));
    if (err) { setOrgMsg(err); return; }
    setPracticeMeta({ organizationScenario: orgScenario, loadedAt: new Date().toISOString() });
    setOrgMsg(`Loaded ${perDept * RETENTION_DEPARTMENTS.length} fictional baseline responses for a ${ORGANIZATION_HEADCOUNT}-employee organization.`);
  };
  const reset = () => {
    if (!window.confirm(`Reset practice session? This removes ${scope}. Example data, example-mode plans, and testing records are kept.`)) return;
    const err = commit(resetPractice);
    if (err) { setOrgMsg(err); return; }
    setPracticeMeta({ organizationScenario: null, loadedAt: null });
    setOrgMsg('Practice session reset.');
  };
  const plan = startedPlans.find((p) => p.id === planId);
  const loadFu = () => {
    if (!plan) { setFuMsg('Choose a started plan.'); return; }
    const hasGen = state.responses.some((r) => r.planId === plan.id && r.fictional);
    if (hasGen && !window.confirm('This replaces the fictional follow-up responses already generated for this plan. Other records are kept. Continue?')) return;
    const err = commit((s) => loadPracticeFollowup(s, plan.id, fuScenario));
    setFuMsg(err ?? `Loaded ${fuScenario === 'small' ? 9 : 20} fictional follow-up responses for ${plan.department}. View them in Progress (${sourceName(plan.source)}).`);
  };

  return <>
    <PageHead eyebrow="Help & Testing" title="Practice Tools" description="Fixed, reproducible fictional data for rehearsing the full workflow. Generated records are labelled fictional and never appear in the employee survey." />
    <div className="grid two-col">
      <section className="card card-pad">
        <div className="card-head"><div><h2>Fictional organization</h2><p className="card-note">Headcount is {ORGANIZATION_HEADCOUNT} employees; not everyone responds. Loads into Practice submissions.</p></div><Building2 size={19} color="#2f8f84" /></div>
        <ScenarioPicker value={orgScenario} onChange={setOrgScenario} name="org-scenario" />
        <p className="small-copy section-gap">Preview of the selected scenario to load—not the current saved response counts.</p>
        <div className="table-wrap section-gap"><table className="data-table"><thead><tr><th>Department</th><th>Headcount</th><th>Baseline responses</th></tr></thead><tbody>
          {RETENTION_DEPARTMENTS.map((d, i) => <tr key={d} data-testid={`row-headcount-${slug(d)}`}><td>{d}</td><td className="mono">{HEADCOUNTS[i]}</td><td className="mono">{perDept}</td></tr>)}
          <tr><td>Total</td><td className="mono">{ORGANIZATION_HEADCOUNT}</td><td className="mono">{perDept * RETENTION_DEPARTMENTS.length}</td></tr>
        </tbody></table></div>
        <p className="small-copy">Replaces only Practice submissions ({scope} now). Example data is never changed.</p>
        <div className="toolbar section-gap">
          <button className="btn btn-primary" onClick={loadOrg} data-testid="button-load-organization"><Building2 size={13} />Load fictional {ORGANIZATION_HEADCOUNT}-employee organization</button>
          <button className="btn btn-danger" onClick={reset} data-testid="button-reset-practice"><RotateCcw size={13} />Reset practice session</button>
        </div>
        {practiceMeta.organizationScenario && <p className="small-copy" data-testid="text-loaded-scenario">Currently loaded: {PRACTICE_SCENARIOS.find((s) => s.key === practiceMeta.organizationScenario)?.label ?? practiceMeta.organizationScenario} scenario ({practiceMeta.loadedAt?.slice(0, 10)}).</p>}
        {orgMsg && <p className="success-msg banner-ok" role="status" data-testid="text-org-message">{orgMsg} <button className="inline-link" style={{ border: 0, background: 'none', padding: 0 }} onClick={() => setSource('submitted')} data-testid="button-switch-practice">Switch to Practice submissions</button></p>}
      </section>
      <section className="card card-pad">
        <div className="card-head"><div><h2>Fictional follow-up</h2><p className="card-note">For any started plan you created, in either data mode.</p></div><Wand2 size={19} color="#2f8f84" /></div>
        {startedPlans.length === 0 ? <div className="empty-state">No started plans yet. Start one in <Link href="/action-plans" className="inline-link">Action Plans</Link>.</div> : <>
          <div className="field"><label htmlFor="fu-plan">Started plan</label>
            <select id="fu-plan" className="select" value={planId} onChange={(e) => { setPlanId(e.target.value); setFuMsg(''); }} data-testid="select-followup-plan">
              <option value="">Choose a plan</option>
              {startedPlans.map((p, i) => <option key={p.id} value={p.id}>Plan {i + 1}: {p.department} · {p.responsible} · Review {p.endDate} · {STRATEGIES.find((s) => s.id === p.strategyId)?.title} ({sourceName(p.source)})</option>)}
            </select></div>
          <div className="section-gap"><ScenarioPicker value={fuScenario} onChange={setFuScenario} name="fu-scenario" /></div>
          <p className="small-copy section-gap">Creates fixed fictional follow-up responses for this plan only. Replaces earlier generated follow-ups for the same plan; refused if real follow-ups were submitted. Never runs automatically.</p>
          <button className="btn btn-primary" onClick={loadFu} disabled={!plan} data-testid="button-load-followup"><Wand2 size={13} />Load fictional follow-up</button>
        </>}
        {fuMsg && <p className="success-msg banner-ok section-gap" role="status" data-testid="text-followup-message">{fuMsg} <Link href="/progress" className="inline-link">Open Progress</Link></p>}
        <p className="caveat">The two built-in example plans (Nursing, Emergency) already contain fixed follow-ups and are not listed.</p>
      </section>
    </div>
  </>;
}
