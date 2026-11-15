export const RETENTION_FACTORS = [
  { key: 'satisfaction', label: 'Job satisfaction', question: 'Overall, I am satisfied with my work.' },
  { key: 'workload', label: 'Workload manageability', question: 'My workload is manageable during a typical week.' },
  { key: 'support', label: 'Management support', question: 'My manager provides the support I need to do my work.' },
  { key: 'career', label: 'Career development', question: 'I have meaningful opportunities to develop my career here.' },
  { key: 'stay', label: 'Intention to stay', question: 'I intend to stay with this organization for the next 12 months.' },
] as const;
export type RetentionFactor = typeof RETENTION_FACTORS[number]['key'];
export type Scores = Record<RetentionFactor, number>;
export type Source = 'demo' | 'submitted';
export const RETENTION_DEPARTMENTS = ['Nursing', 'Emergency', 'Surgery', 'Intensive Care', 'Pediatrics', 'Radiology', 'Pharmacy', 'Administration'];
export type Response = { id: string; department: string; answers: Scores; createdAt: string; planId?: string; source?: Source; fictional?: boolean };
export type Aggregate = { count: number; scores: Scores | null };
export type PlanStatus = 'Planned' | 'In Progress' | 'Completed';
export type Plan = {
  id: string; department: string; strategyId: string; responsible: string;
  startDate: string; endDate: string; target: number; status: PlanStatus;
  source: Source; baseline: Aggregate | null; startedAt: string | null;
};
export type RetentionState = { version: 1; responses: Response[]; plans: Plan[] };
export type Strategy = {
  id: string; factor: Exclude<RetentionFactor, 'stay'>; title: string; rationale: string;
  steps: string[]; days: 30 | 60; criterion: string;
};
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const validDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
const timestamp = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));
const validScores = (v: unknown, ratings = false): boolean => record(v) && RETENTION_FACTORS.every(({ key }) => typeof v[key] === 'number' && Number.isFinite(v[key]) && Number(v[key]) >= (ratings ? 1 : 0) && Number(v[key]) <= (ratings ? 5 : 100) && (!ratings || Number.isInteger(v[key])));
export function isRetentionState(v: unknown): v is RetentionState {
  if (!record(v) || v.version !== 1 || !Array.isArray(v.responses) || !Array.isArray(v.plans)) return false;
  const plans = v.plans;
  if (!plans.every((p: unknown) => {
    if (!record(p) || typeof p.id !== 'string' || !p.id || typeof p.department !== 'string' || !RETENTION_DEPARTMENTS.includes(p.department)
      || !STRATEGIES.some(s => s.id === p.strategyId) || !['demo', 'submitted'].includes(String(p.source))
      || !['Planned', 'In Progress', 'Completed'].includes(String(p.status)) || typeof p.responsible !== 'string'
      || !validDate(p.startDate) || !validDate(p.endDate) || p.endDate <= p.startDate
      || typeof p.target !== 'number' || !Number.isFinite(p.target) || p.target < 1 || p.target > 100) return false;
    if (p.status === 'Planned') return p.baseline === null && p.startedAt === null;
    return record(p.baseline) && Number.isInteger(p.baseline.count) && Number(p.baseline.count) >= 10 && validScores(p.baseline.scores) && timestamp(p.startedAt);
  })) return false;
  if (new Set(plans.map(p => p.id)).size !== plans.length) return false;
  if (!v.responses.every((r: unknown) => record(r) && typeof r.id === 'string' && !!r.id
    && typeof r.department === 'string' && RETENTION_DEPARTMENTS.includes(r.department)
    && timestamp(r.createdAt) && validScores(r.answers, true)
    && (r.source === undefined || r.source === 'demo' || r.source === 'submitted')
    && (r.planId === undefined || plans.some(p => p.id === r.planId && p.source === (r.source ?? 'submitted') && p.department === r.department && p.baseline)))) return false;
  return new Set(v.responses.map(r => r.id)).size === v.responses.length;
}
export const STRATEGIES: Strategy[] = [
  { id: 'workload-scheduling', factor: 'workload', title: 'Review scheduling and workload distribution', rationale: 'The job demands–resources framework suggests that balancing demands with adequate resources can reduce strain. This is a plausible strategy, not a guarantee of retention.', steps: ['Ask staff which shifts and tasks create the greatest pressure.', 'Review assignments and redistribute avoidable workload with staff input.', 'Check workload weekly and adjust the trial schedule.'], days: 30, criterion: 'Increase the workload manageability score by at least 10 points.' },
  { id: 'workload-resources', factor: 'workload', title: 'Assess staffing and resource needs', rationale: 'Adequate staffing and task resources can help employees meet demands without sustained overload, consistent with the job demands–resources framework.', steps: ['Compare workload and available resources by shift.', 'Identify one recurring resource gap with the team.', 'Trial a feasible resource change and document staff feedback.'], days: 60, criterion: 'Increase the workload manageability score by at least 10 points.' },
  { id: 'support-checkins', factor: 'support', title: 'Introduce weekly supervisor check-ins', rationale: 'Perceived organizational support and high-quality supervisor relationships may help employees feel heard and supported.', steps: ['Set a short weekly check-in with each team.', 'Ask about barriers and agree on one practical response.', 'Report back on actions taken without identifying survey respondents.'], days: 30, criterion: 'Increase the management support score by at least 10 points.' },
  { id: 'support-training', factor: 'support', title: 'Practice supportive management', rationale: 'Fair treatment, listening, and consistent follow-through are relevant to organizational justice and psychological safety.', steps: ['Train supervisors in active listening and fair feedback.', 'Agree on response standards for staff concerns.', 'Review anonymous team feedback and adjust manager practices.'], days: 60, criterion: 'Increase the management support score by at least 10 points.' },
  { id: 'career-pathways', factor: 'career', title: 'Create practical development pathways', rationale: 'Self-determination theory emphasizes competence and autonomy. Clear opportunities to learn can support both, though effects vary by context.', steps: ['Ask staff which skills they want to develop.', 'Identify realistic mentoring or learning opportunities.', 'Protect time for learning and review access across shifts.'], days: 60, criterion: 'Increase the career development score by at least 10 points.' },
  { id: 'career-mentoring', factor: 'career', title: 'Pilot peer mentoring', rationale: 'Social learning and access to supportive role models may help employees build skills and see growth opportunities.', steps: ['Invite voluntary mentor and mentee participation.', 'Agree on a specific learning goal.', 'Schedule protected mentoring sessions and review progress.'], days: 30, criterion: 'Increase the career development score by at least 10 points.' },
  { id: 'satisfaction-jobdesign', factor: 'satisfaction', title: 'Review everyday work design', rationale: 'The job characteristics model highlights autonomy, feedback, and meaningful work as relevant to job satisfaction.', steps: ['Discuss tasks that help or hinder meaningful work.', 'Co-design one feasible change that increases autonomy or feedback.', 'Trial the change and review aggregate feedback.'], days: 60, criterion: 'Increase the job satisfaction score by at least 10 points.' },
  { id: 'satisfaction-listening', factor: 'satisfaction', title: 'Run a team listening and action cycle', rationale: 'Employee voice and procedural fairness may support satisfaction when input leads to visible, credible action.', steps: ['Gather voluntary suggestions without names.', 'Agree on one achievable team priority.', 'Share the action taken and invite follow-up feedback.'], days: 30, criterion: 'Increase the job satisfaction score by at least 10 points.' },
];

export function aggregate(responses: Response[]): Aggregate {
  if (responses.length < 10) return { count: responses.length, scores: null };
  const scores = Object.fromEntries(RETENTION_FACTORS.map(({ key }) => [
    key, responses.reduce((sum, response) => sum + (response.answers[key] - 1) * 25, 0) / responses.length,
  ])) as Scores;
  return { count: responses.length, scores };
}

// Fixed examples use actual five-point answers. No random numbers or invented risk probabilities.
// Each group of 20 responses permits exact 1.25-point score increments.
const DEMO_BASELINES: Scores[] = [
  { satisfaction: 60, workload: 40, support: 60, career: 55, stay: 55 },
  { satisfaction: 55, workload: 45, support: 50, career: 60, stay: 50 },
  { satisfaction: 70, workload: 65, support: 75, career: 60, stay: 70 },
  { satisfaction: 60, workload: 50, support: 65, career: 55, stay: 60 },
  { satisfaction: 80, workload: 75, support: 80, career: 65, stay: 80 },
  { satisfaction: 70, workload: 70, support: 75, career: 60, stay: 75 },
  { satisfaction: 75, workload: 65, support: 70, career: 60, stay: 70 },
  { satisfaction: 70, workload: 75, support: 65, career: 55, stay: 65 },
];
export function exampleResponses(department: string, followup = false): Response[] {
  const index = RETENTION_DEPARTMENTS.indexOf(department);
  if (index < 0) return [];
  const scores = { ...DEMO_BASELINES[index] };
  // Nursing improves in this authored example; Emergency intentionally remains unchanged.
  if (followup && department === 'Nursing') {
    Object.assign(scores, { satisfaction: 70, workload: 65, support: 70, career: 60, stay: 70 });
  }
  return Array.from({ length: 20 }, (_, i) => ({
    id: `example-${index}-${followup ? 'after' : 'before'}-${i}`,
    department, createdAt: followup ? '2026-03-02T12:00:00.000Z' : '2026-01-01T12:00:00.000Z',
    answers: Object.fromEntries(RETENTION_FACTORS.map(({ key }) => {
      const rating = 1 + scores[key] / 25;
      const low = Math.floor(rating);
      return [key, low + (i < Math.round((rating - low) * 20) ? 1 : 0)];
    })) as Scores,
  }));
}
export function departmentAggregate(state: RetentionState, department: string, source: Source): Aggregate {
  return aggregate(source === 'demo' ? exampleResponses(department) : state.responses.filter(r => r.department === department && !r.planId && (r.source ?? 'submitted') === source));
}
export function lowestFactors(scores: Scores) {
  return RETENTION_FACTORS.filter(f => f.key !== 'stay').sort((a, b) => scores[a.key] - scores[b.key]).slice(0, 3);
}
export function recommend(scores: Scores): Strategy[] {
  const lowest = lowestFactors(scores);
  return [STRATEGIES.find(s => s.factor === lowest[0].key)!, STRATEGIES.filter(s => s.factor === lowest[0].key)[1], STRATEGIES.find(s => s.factor === lowest[1].key)!];
}
export function followupAggregate(state: RetentionState, plan: Plan): Aggregate {
  if (!plan.baseline) return { count: 0, scores: null };
  if (plan.id === 'demo-nursing' || plan.id === 'demo-emergency') return aggregate(exampleResponses(plan.department, true));
  return aggregate(state.responses.filter(r => r.planId === plan.id && (r.source ?? 'submitted') === plan.source && r.department === plan.department && !!plan.startedAt && r.createdAt >= plan.startedAt));
}
export function initialRetentionState(): RetentionState {
  return {
    version: 1, responses: [],
    plans: ['Nursing', 'Emergency'].map((department) => ({
      id: `demo-${department.toLowerCase()}`, department, strategyId: 'workload-scheduling',
      responsible: 'Department leadership', startDate: '2026-01-01', endDate: '2026-03-02',
      target: 10, status: 'Completed', source: 'demo', baseline: aggregate(exampleResponses(department)), startedAt: '2026-01-01T12:00:00.000Z',
    })),
  };
}
export function savePlan(state: RetentionState, input: Plan, now = new Date().toISOString()): RetentionState {
  const previous = state.plans.find(p => p.id === input.id);
  if (!RETENTION_DEPARTMENTS.includes(input.department) || !STRATEGIES.some(s => s.id === input.strategyId)) throw new Error('Choose a valid department and strategy.');
  if (!['Planned', 'In Progress', 'Completed'].includes(input.status)) throw new Error('Choose a valid status.');
  if (!input.responsible.trim() || !Number.isFinite(input.target) || input.target <= 0 || input.target > 100) throw new Error('Enter a responsible role and a target between 1 and 100 points.');
  if (!validDate(input.startDate) || !validDate(input.endDate) || input.endDate <= input.startDate) throw new Error('End date must be after the start date; use valid calendar dates.');
  if (previous?.baseline && (previous.department !== input.department || previous.source !== input.source || previous.strategyId !== input.strategyId)) throw new Error('The department, source, and strategy are locked after baseline capture. Create another plan to investigate a different strategy.');
  if (previous?.baseline && input.status === 'Planned') throw new Error('A started intervention cannot return to Planned.');
  if (input.status === 'Completed' && !previous?.baseline) throw new Error('Start the intervention before marking it Completed.');
  let baseline = previous?.baseline ?? null;
  let startedAt = previous?.startedAt ?? null;
  if (input.status === 'In Progress' && !baseline) {
    baseline = departmentAggregate(state, input.department, input.source);
    if (!baseline.scores) throw new Error('At least 10 baseline responses are required to start an intervention.');
    startedAt = now;
  }
  const plan = { ...input, baseline, startedAt };
  return { ...state, plans: previous ? state.plans.map(p => p.id === input.id ? plan : p) : [...state.plans, plan] };
}
export function addResponse(state: RetentionState, response: Response): RetentionState {
  if (!RETENTION_DEPARTMENTS.includes(response.department) || RETENTION_FACTORS.some(f => !Number.isInteger(response.answers[f.key]) || response.answers[f.key] < 1 || response.answers[f.key] > 5)) throw new Error('Select a department and answer all five questions.');
  if (response.planId) {
    const plan = state.plans.find(p => p.id === response.planId);
    if (!plan || !plan.baseline || plan.source !== (response.source ?? 'submitted') || plan.department !== response.department) throw new Error('Select a started intervention in this department and data mode.');
  }
  return { ...state, responses: [...state.responses, response] };
}
export function resetExamples(state: RetentionState): RetentionState {
  return { ...state, plans: [...initialRetentionState().plans, ...state.plans.filter(p => p.id !== 'demo-nursing' && p.id !== 'demo-emergency')] };
}
