import { useEffect } from 'react';
import { SurveyForm } from '@/components/retention/survey-form';
import { StorageBanner } from '@/components/retention/ui';

export default function EmployeeSurveyPage() {
  useEffect(() => { document.title = 'Staff survey | RetainIQ'; }, []);
  return <div className="employee-shell">
    <header className="employee-head"><span className="brand-mark">R</span><div><p className="eyebrow" style={{ margin: 0 }}>Staff survey</p><strong>Five questions about your work</strong></div></header>
    <main className="employee-main">
      <StorageBanner />
      <p className="lede" style={{ marginBottom: 14 }}>Voluntary and anonymous. No names, IDs, or comments are collected. Results are only shown as department averages once at least 10 people respond.</p>
      <div className="notice" style={{ marginBottom: 16 }} data-testid="text-employee-limit"><strong>Practice survey on this device.</strong> Your answer is saved only in this browser as a practice submission. It is not sent to HR or combined with answers from other devices.</div>
      <section className="card card-pad"><SurveyForm /></section>
    </main>
  </div>;
}
