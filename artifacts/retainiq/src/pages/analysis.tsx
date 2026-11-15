import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { departmentAggregate, lowestFactors, RETENTION_DEPARTMENTS, RETENTION_FACTORS } from '@/lib/retention';
import { useRetention } from '@/hooks/use-retention-store';
import { PageHead, ScoreBar, SourceBadge, SourceNote, Suppressed, fmt, slug } from '@/components/retention/ui';

export default function AnalysisPage() {
  const { state, source, department, setDepartment } = useRetention();
  const rows = RETENTION_DEPARTMENTS.map((d) => ({ d, agg: departmentAggregate(state, d, source) }));
  const detail = rows.find((r) => r.d === department) ?? rows[0];
  const low = detail.agg.scores ? lowestFactors(detail.agg.scores)[0] : null;
  const view = (d: string) => { setDepartment(d); requestAnimationFrame(() => document.getElementById('dept-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); };

  return <>
    <PageHead eyebrow="Results" title="How are departments doing?" description="Average survey scores by department on a 0 to 100 scale. Higher is more favorable. Use the lowest-rated factor as a starting point for a conversation with staff." />
    <SourceNote source={source} />
    <section className="card card-pad">
      <div className="card-head"><div><h2>Department comparison</h2><p className="card-note">Groups under 10 responses are hidden.</p></div><SourceBadge source={source} /></div>
      <div className="table-wrap"><table className="data-table results-table"><thead><tr><th>Department</th><th>Responses</th><th>Intention to stay</th><th>Lowest-rated factor</th><th></th></tr></thead><tbody>
        {rows.map(({ d, agg }) => { const l = agg.scores ? lowestFactors(agg.scores)[0] : null; return <tr key={d} className={d === detail.d ? 'focus-row' : ''} data-testid={`row-results-${slug(d)}`}>
          <td>{d}</td><td className="mono" data-testid={`text-count-${d}`}>{agg.count}</td>
          <td className="mono" data-testid={`text-stay-${d}`}>{agg.scores ? fmt(agg.scores.stay) : <span className="subtle">Hidden</span>}</td>
          <td>{l && agg.scores ? <>{l.label} <span className="mono subtle">{fmt(agg.scores[l.key])}</span></> : <span className="subtle">{10 - agg.count} more needed</span>}</td>
          <td style={{ textAlign: 'right' }}><button className="btn btn-small" onClick={() => view(d)} data-testid={`button-view-${slug(d)}`}>View department</button></td></tr>; })}
      </tbody></table></div>
    </section>

    <section id="dept-detail" className="card card-pad section-gap dept-card" data-testid="card-department-detail">
      <div className="card-head"><div><p className="eyebrow">Department detail</p><h2>{detail.d}</h2><p className="card-note" data-testid="text-detail-count">{detail.agg.count} responses</p></div><SourceBadge source={source} /></div>
      {!detail.agg.scores || !low ? <Suppressed count={detail.agg.count} /> : <>
        {RETENTION_FACTORS.map((f) => <ScoreBar key={f.key} label={f.label} score={detail.agg.scores![f.key]} emphasis={f.key === low.key} testId={`score-${f.key}`} />)}
        <p className="conclusion" data-testid="text-interpretation"><strong>Lowest-rated factor:</strong> {low.label} ({fmt(detail.agg.scores[low.key])}/100). This is the factor staff rated least favorably here, not automatically a problem. Ask {detail.d} staff whether it reflects their experience before acting. Intention to stay is {fmt(detail.agg.scores.stay)}/100.</p>
        <Link href="/action-plans" className="btn btn-primary btn-small" data-testid="link-review-actions">Review suggested actions <ArrowRight size={13} /></Link>
      </>}
      <p className="caveat">Scores are averages of 1 to 5 answers converted to 0 to 100 (1 = 0, 3 = 50, 5 = 100). A score of 60 does not mean 60% of employees agree. Intention to stay is a self-reported attitude, not a turnover prediction.</p>
    </section>
  </>;
}
