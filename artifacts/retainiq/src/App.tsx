import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { BarChart3, BookOpen, LineChart, ListChecks, Menu, MessageSquareText, Wrench } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { RetentionProvider } from '@/hooks/use-retention-store';
import { ModeSelector, StorageBanner } from '@/components/retention/ui';
import SurveyPage from '@/pages/survey';
import EmployeeSurveyPage from '@/pages/employee-survey';
import AnalysisPage from '@/pages/analysis';
import LabPage from '@/pages/lab';
import TrackerPage from '@/pages/tracker';
import MethodologyPage from '@/pages/methodology';
import PracticeToolsPage from '@/pages/practice-tools';

const queryClient = new QueryClient();
const navMain = [
  { href: '/survey', label: 'Survey', Icon: MessageSquareText },
  { href: '/results', label: 'Results', Icon: BarChart3 },
  { href: '/action-plans', label: 'Action Plans', Icon: ListChecks },
  { href: '/progress', label: 'Progress', Icon: LineChart },
];
const navRef = [
  { href: '/methodology', label: 'Methodology & Privacy', Icon: BookOpen },
  { href: '/practice-tools', label: 'Practice Tools', Icon: Wrench },
];
const aliases: Record<string, string> = { '/': '/results', '/analysis': '/results', '/trends': '/results', '/prediction': '/results', '/momentum': '/results', '/lab': '/action-plans', '/recommendations': '/action-plans', '/tracker': '/progress', '/about': '/methodology' };

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobile, setMobile] = useState(false);
  const current = aliases[location] ?? location;
  const all = [...navMain, ...navRef];
  const title = all.find((n) => n.href === current)?.label ?? 'Not found';
  useEffect(() => {
    document.title = `${title} | RetainIQ`;
    const description = `${title}: healthcare employee listening, practical action plans, and aggregated follow-up review in a fictional learning prototype.`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', `${title} | RetainIQ`);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
  }, [title]);
  const link = (n: typeof navMain[number]) => <Link key={n.href} href={n.href} onClick={() => setMobile(false)} className={`nav-link ${current === n.href ? 'active' : ''}`} data-testid={`link-nav-${n.href.slice(1)}`}><n.Icon /><span>{n.label}</span></Link>;
  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/results" className="brand" data-testid="link-brand"><span className="brand-mark">R</span><span><span className="brand-name">RetainIQ</span><span className="brand-sub">Listen · Act · Review</span></span></Link>
      <div className="nav-label">Workflow</div><nav className="nav-list">{navMain.map(link)}</nav>
      <div className="sidebar-bottom"><div className="nav-label">Help &amp; Testing</div><nav className="nav-list">{navRef.map(link)}</nav>
        <div className="side-footer">Browser-local prototype.<br />Not a secure multi-user HR system.</div></div>
    </aside>
    <div className="main-column">
      <header className="topbar">
        <div className="mobile-menu"><button className="btn btn-small" onClick={() => setMobile(!mobile)} aria-label="Toggle navigation" data-testid="button-mobile-menu"><Menu size={15} /></button><span className="brand-name" style={{ color: '#1b3049', fontSize: 14 }}>RetainIQ</span></div>
        <div className="crumb">RetainIQ<span style={{ margin: '0 7px', color: '#bdc8cf' }}>/</span><b>{title}</b></div>
        <ModeSelector />
      </header>
      {mobile && <nav className="mobile-nav"><div className="nav-label">Workflow</div>{navMain.map(link)}<div className="nav-label">Help &amp; Testing</div>{navRef.map(link)}</nav>}
      <main className="content"><StorageBanner />{children}
        <div className="page-footer"><span>RetainIQ · Learning prototype · fictional data</span><span>Aggregated results only · groups under 10 hidden</span></div></main>
    </div>
  </div>;
}

function Routes() {
  const [location] = useLocation();
  if (location === '/employee-survey') return <ErrorBoundary resetKey={location}><EmployeeSurveyPage /></ErrorBoundary>;
  return <ErrorBoundary resetKey={location}><Shell><Switch>
    <Route path="/"><AnalysisPage /></Route>
    <Route path="/results"><AnalysisPage /></Route>
    <Route path="/analysis"><AnalysisPage /></Route>
    <Route path="/trends"><AnalysisPage /></Route>
    <Route path="/prediction"><AnalysisPage /></Route>
    <Route path="/momentum"><AnalysisPage /></Route>
    <Route path="/action-plans"><LabPage /></Route>
    <Route path="/lab"><LabPage /></Route>
    <Route path="/recommendations"><LabPage /></Route>
    <Route path="/survey"><SurveyPage /></Route>
    <Route path="/progress"><TrackerPage /></Route>
    <Route path="/tracker"><TrackerPage /></Route>
    <Route path="/practice-tools"><PracticeToolsPage /></Route>
    <Route path="/methodology"><MethodologyPage /></Route>
    <Route path="/about"><MethodologyPage /></Route>
    <Route path="/testing-feedback"><Redirect to="/results" replace /></Route>
    <Route component={NotFound} />
  </Switch></Shell></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><RetentionProvider>
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Routes /></WouterRouter>
  </RetentionProvider><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
