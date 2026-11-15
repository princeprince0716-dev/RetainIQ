import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { resetExamples } from '@/lib/retention';
import { useRetention } from '@/hooks/use-retention-store';
import { PageHead } from '@/components/retention/ui';

const sources = [
  ['Bakker & Demerouti (2007)', 'Job demands–resources model', 'Workload and staffing strategies: balancing work demands with resources such as time, staffing, and support.'],
  ['Eisenberger et al. (1986)', 'Perceived organizational support', 'Supervisor check-in and supportive management strategies: employees who feel supported may feel more committed.'],
  ['Hackman & Oldham (1976)', 'Job characteristics model', 'Work design strategies: autonomy, feedback, and meaningful tasks relate to satisfaction.'],
  ['Deci & Ryan (2000)', 'Self-determination theory', 'Career development strategies: competence, autonomy, and relatedness support motivation.'],
];

export default function MethodologyPage() {
  const { commit } = useRetention();
  const [msg, setMsg] = useState('');
  const reset = () => {
    if (!window.confirm('Reset only the two predefined demonstration plans (Nursing and Emergency) to their original state? Practice submissions, plans you created, and testing records are kept.')) return;
    const err = commit(resetExamples);
    setMsg(err ?? 'The two predefined demonstration plans were restored. Nothing else changed.');
  };
  return <>
    <PageHead eyebrow="Methodology & Privacy" title="How RetainIQ works, and its limits." description="Plain-language notes on scoring, recommendations, privacy, and data storage." />
    <div className="grid two-col">
      <section className="card card-pad prose-card">
        <h2>Scoring</h2>
        <p>Each of the five questions uses a five-point agreement scale. Answers become 0 to 100 scores using (answer − 1) × 25, then are averaged per department. Higher scores mean more favorable conditions or stronger intention to stay.</p>
        <p><strong>Intention to stay is a survey measure, not a confirmed turnover outcome.</strong> RetainIQ does not predict who will leave.</p>
        <h2>Recommendations</h2>
        <p>Recommendations are rule-based theoretical suggestions, not validated treatment effects and not AI output. RetainIQ finds a department's lowest-rated factors and shows strategies linked to those factors. The theories below explain why a strategy is plausible; they do not show it will work in your setting, and none of these strategies has been experimentally tested in this tool.</p>
        <div className="source-list">{sources.map(([cite, name, use]) => <div key={cite} className="source-item"><strong>{cite}</strong><span className="source-name">{name}</span><p>{use}</p></div>)}</div>
        <h2>Before and after</h2>
        <p>Starting an intervention saves the department's baseline scores. Follow-up responses linked to that plan are compared later. A change does not prove the intervention caused it.</p>
      </section>
      <aside className="grid" style={{ alignContent: 'start' }}>
        <section className="card card-pad prose-card"><h2>Privacy</h2>
          <ul><li>The employee survey collects no names, IDs, emails, or free text. Use roles rather than real names in intervention plans, and avoid personal information in testing notes.</li><li>Results appear only for groups with at least 10 responses, including follow-ups.</li><li>Individual survey answers are never displayed or exported.</li><li>Small-group suppression reduces, but does not guarantee, anonymity.</li></ul></section>
        <section className="card card-pad prose-card"><h2>Storage</h2>
          <p>All data is saved in this browser's local storage. This is a classroom prototype: it is <strong>not a secure, multi-user HR system</strong>. Anyone using this browser profile can access stored records, and clearing site data removes them.</p></section>
        <section className="card card-pad prose-card"><h2>Example data and practice</h2>
          <p>Example data: fixed, fictional responses (20 for each of eight departments) with two built-in plans. Nursing shows improvement; Emergency shows no change. Practice submissions hold survey responses entered in this browser plus any fictional records loaded from Practice Tools. The two modes are never combined.</p>
          <p>Any plan you start, in either mode, can complete the full baseline-to-follow-up cycle: collect practice follow-ups through the employee survey, or load clearly labelled fictional follow-ups in Practice Tools. Practice submissions cannot be collected across devices.</p>
          <button className="btn btn-small" onClick={reset} data-testid="button-reset-examples"><RotateCcw size={13} />Reset the two built-in example plans</button>
          <p className="small-copy" style={{ marginTop: 8 }}>This only restores the Nursing and Emergency example plans. Practice submissions, plans you created, and testing or peer-review records are kept.</p>
          {msg && <p className="success-msg" role="status" data-testid="text-reset-message">{msg}</p>}
        </section>
      </aside>
    </div>
  </>;
}
