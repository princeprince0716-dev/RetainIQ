import { useState } from 'react';
import { Check, Download } from 'lucide-react';
import type { PeerEntry, TaskEntry } from '@/lib/demo-store';
import { useLegacyTesting } from '@/hooks/use-legacy-testing';
import { PageHead } from '@/components/retention/ui';

const testerTasks = [
  'Submit a survey response, then find how many more responses that department needs before results appear.',
  'In Retention Analysis, using demonstration examples, identify the lowest-rated factor for Nursing.',
  'In the Intervention Lab, create a plan for a recommended strategy and start it.',
  'In the Improvement Tracker, decide whether the Emergency example reached its target and what HR should do next.',
];
const blankReview = (): PeerEntry => ({ strengths: '', risks: '', suggestions: '', rating: '', savedAt: '' });
const csvEscape = (v: string) => `"${v.replaceAll('"', '""')}"`;
function downloadCsv(tasks: TaskEntry[], reviews: PeerEntry[]) {
  const rows = [['record_type', 'task', 'success', 'time_seconds', 'errors', 'comments', 'strengths', 'risks', 'suggestions', 'deployability_rating', 'saved_at']];
  tasks.forEach((t) => rows.push(['tester_task', t.task, t.success, t.seconds, t.errors, t.comments, '', '', '', '', t.savedAt]));
  reviews.forEach((r, i) => rows.push(['peer_review', `Peer review ${i + 1}`, '', '', '', '', r.strengths, r.risks, r.suggestions, r.rating, r.savedAt]));
  const csv = rows.map((row) => row.map((v) => csvEscape(String(v))).join(',')).join('\r\n');
  const href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = href; a.download = 'retainiq-testing-feedback.csv'; a.click(); URL.revokeObjectURL(href);
}

export default function TestingFeedbackPage() {
  const { tasks, reviews, error, save } = useLegacyTesting();
  const [taskValues, setTaskValues] = useState<TaskEntry[]>(testerTasks.map((task) => ({ task, success: '', seconds: '', errors: '', comments: '', savedAt: '' })));
  const [review, setReview] = useState<PeerEntry>(blankReview());
  const [reviewIndex, setReviewIndex] = useState(0);
  const [message, setMessage] = useState('');
  const upd = (i: number, k: keyof TaskEntry, v: string) => setTaskValues((vals) => vals.map((x, j) => j === i ? { ...x, [k]: v } : x));
  const saveTask = (i: number) => {
    const e = taskValues[i];
    if (!e.success || !e.seconds.trim()) { setMessage('Record success and elapsed time before saving this task.'); return; }
    const err = save({ tasks: [...tasks, { ...e, savedAt: new Date().toISOString() }], reviews });
    setMessage(err ?? 'Task result saved in this browser.');
  };
  const saveReview = () => {
    if (!review.strengths.trim() && !review.risks.trim() && !review.suggestions.trim() && !review.rating) { setMessage('Add at least one peer-review field before saving.'); return; }
    const next = [...reviews]; next[reviewIndex] = { ...review, savedAt: new Date().toISOString() };
    const err = save({ tasks, reviews: next });
    if (err) { setMessage(err); return; }
    setMessage(`Peer review form ${reviewIndex + 1} saved locally.`);
    if (reviewIndex === 0) { setReviewIndex(1); setReview(blankReview()); }
  };
  const setField = (k: keyof PeerEntry, v: string) => setReview((r) => ({ ...r, [k]: v }));
  return <>
    <PageHead eyebrow="Testing & Peer Feedback" title="Milestone 3 usability study." description="Record real tester outcomes and peer reviews. Nothing here is pre-filled or invented. Records stay in this browser and are kept separate from survey data." />
    {error && <div className="storage-banner" role="alert" data-testid="banner-testing-error"><div><strong>Storage problem.</strong> {error}</div></div>}
    <div className="grid two-col">
      <section className="card card-pad"><div className="card-head"><div><h2>Tester tasks</h2><p className="card-note">Record success, elapsed time, errors, and comments.</p></div><span className="pill">{tasks.length} saved</span></div>
        {testerTasks.map((task, i) => <div className="task-card" key={task}><div className="task-number">{i + 1}</div><div><div className="task-title">{task}</div><div className="form-grid" style={{ marginTop: 12 }}>
          <div className="field"><label htmlFor={`success-${i}`}>Task success</label><select className="select" id={`success-${i}`} value={taskValues[i].success} onChange={(e) => upd(i, 'success', e.target.value)} data-testid={`select-success-${i + 1}`}><option value="">Choose outcome</option><option>Completed</option><option>Partially completed</option><option>Not completed</option></select></div>
          <div className="field"><label htmlFor={`seconds-${i}`}>Time (seconds)</label><input className="input" id={`seconds-${i}`} type="number" min={0} value={taskValues[i].seconds} onChange={(e) => upd(i, 'seconds', e.target.value)} data-testid={`input-seconds-${i + 1}`} /></div>
          <div className="field"><label htmlFor={`errors-${i}`}>Errors</label><input className="input" id={`errors-${i}`} value={taskValues[i].errors} onChange={(e) => upd(i, 'errors', e.target.value)} placeholder="Describe, or enter none" data-testid={`input-errors-${i + 1}`} /></div>
          <div className="field"><label htmlFor={`comments-${i}`}>Comments</label><input className="input" id={`comments-${i}`} value={taskValues[i].comments} onChange={(e) => upd(i, 'comments', e.target.value)} placeholder="Optional notes" data-testid={`input-comments-${i + 1}`} /></div>
          <div><button className="btn btn-small btn-primary" onClick={() => saveTask(i)} data-testid={`button-save-task-${i + 1}`}><Check size={13} />Save result</button></div>
        </div></div></div>)}
      </section>
      <section className="card card-pad"><div className="card-head"><div><h2>Peer review</h2><p className="card-note">Two independent forms. Fields start blank.</p></div><span className="pill">Form {reviewIndex + 1} of 2</span></div>
        <div className="field" style={{ marginBottom: 12 }}><label htmlFor="review-strengths">Strengths</label><textarea id="review-strengths" className="textarea" value={review.strengths} onChange={(e) => setField('strengths', e.target.value)} data-testid="input-review-strengths" /></div>
        <div className="field" style={{ marginBottom: 12 }}><label htmlFor="review-risks">Risks</label><textarea id="review-risks" className="textarea" value={review.risks} onChange={(e) => setField('risks', e.target.value)} data-testid="input-review-risks" /></div>
        <div className="field" style={{ marginBottom: 12 }}><label htmlFor="review-suggestions">Suggestions</label><textarea id="review-suggestions" className="textarea" value={review.suggestions} onChange={(e) => setField('suggestions', e.target.value)} data-testid="input-review-suggestions" /></div>
        <div className="field" style={{ marginBottom: 16 }}><label>Deployability rating</label><div className="rating">{['Not ready', 'Needs work', 'Review further', 'Conditionally ready', 'Ready'].map((r) => <button type="button" className={review.rating === r ? 'selected' : ''} key={r} onClick={() => setField('rating', r)}>{r}</button>)}</div></div>
        <div className="toolbar"><button className="btn btn-primary" onClick={saveReview} data-testid="button-save-peer-review">Save peer review</button>
          <button className="btn" onClick={() => { const i = reviewIndex === 0 ? 1 : 0; setReviewIndex(i); setReview(reviews[i] ?? blankReview()); }} data-testid="button-switch-review">Switch to form {reviewIndex === 0 ? 2 : 1}</button></div>
      </section>
    </div>
    <section className="card card-pad section-gap"><div className="card-head"><div><h2>Saved testing records</h2><p className="card-note">Only tester and peer-review entries are exported. Survey answers are never included.</p></div><button className="btn btn-small" onClick={() => downloadCsv(tasks, reviews)} data-testid="button-export-csv"><Download size={14} />Export CSV</button></div>
      {message && <p className="success-msg" role="status" data-testid="text-testing-message">{message}</p>}
      {tasks.length === 0 && reviews.length === 0 ? <div className="empty-state">Nothing recorded yet. No tester results or reviewer opinions have been invented.</div>
        : <div className="table-wrap"><table className="data-table"><thead><tr><th>Type</th><th>Entry</th><th>Outcome / rating</th><th>Time</th><th>Notes</th></tr></thead><tbody>
          {tasks.map((t, i) => <tr key={`t-${i}`}><td>Tester task</td><td>{t.task}</td><td>{t.success}</td><td>{t.seconds}s</td><td>{[t.errors, t.comments].filter(Boolean).join(' · ')}</td></tr>)}
          {reviews.map((r, i) => r && <tr key={`r-${i}`}><td>Peer review</td><td>Form {i + 1}</td><td>{r.rating || 'Not rated'}</td><td>-</td><td>{[r.strengths, r.risks, r.suggestions].filter(Boolean).join(' · ')}</td></tr>)}
        </tbody></table></div>}
    </section>
  </>;
}
