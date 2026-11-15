import { Link } from 'wouter';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { RETENTION_DEPARTMENTS } from '@/lib/retention';
import { useRetention } from '@/hooks/use-retention-store';
import { PageHead } from '@/components/retention/ui';
import { SurveyForm } from '@/components/retention/survey-form';

export default function SurveyPage() {
  const { state } = useRetention();
  const counts = RETENTION_DEPARTMENTS.map((d) => ({ d, n: state.responses.filter((r) => r.department === d && !r.planId && (r.source ?? 'submitted') === 'submitted').length }));
  return <>
    <PageHead eyebrow="Survey" title="Five questions. No names." description="A short, voluntary survey about everyday working conditions. Every response is saved as a Practice submission in this browser and only shown as department averages.">
      <Link href="/employee-survey" className="btn btn-small" data-testid="link-employee-view"><ExternalLink size={13} />Open employee view</Link>
    </PageHead>
    <div className="notice" style={{ marginBottom: 18 }} data-testid="text-browser-limit"><strong>Browser-only.</strong> Responses are stored on this device. Staff on other phones or computers cannot add to the same results; this prototype cannot collect surveys across devices.</div>
    <div className="grid two-col">
      <section className="card card-pad"><SurveyForm /></section>
      <aside className="card card-pad">
        <div className="card-head"><div><h2>Practice responses</h2><p className="card-note">General survey counts by department.</p></div><ShieldCheck size={19} color="#2f8f84" /></div>
        <div className="notice"><strong>10-response minimum.</strong> Results stay hidden until a group has 10 responses.</div>
        <div className="department-list section-gap">{counts.map(({ d, n }) => <div className="department-row" key={d} data-testid={`row-count-${d}`}><span className="dept-name">{d}</span><span className="dept-value">{n} / 10</span><span className="dept-value">{n >= 10 ? 'Visible' : 'Hidden'}</span></div>)}</div>
        <p className="small-copy section-gap">Switch the data mode to Practice submissions to see these results.</p>
      </aside>
    </div>
  </>;
}
