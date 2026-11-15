import { RETENTION_DEPARTMENTS, RETENTION_FACTORS, type Response, type RetentionState, type Scores } from './retention.ts';

export const PRACTICE_SCENARIOS = [
  { key: 'improvement', label: 'Improvement' },
  { key: 'unchanged', label: 'No improvement' },
  { key: 'worsening', label: 'Worsening conditions' },
  { key: 'small', label: 'Fewer than 10 responses' },
  { key: 'favorable', label: 'Generally favorable scores' },
] as const;
export type PracticeScenario = typeof PRACTICE_SCENARIOS[number]['key'];
export const HEADCOUNTS = [120, 85, 65, 60, 55, 40, 40, 35];
export const ORGANIZATION_HEADCOUNT = HEADCOUNTS.reduce((a, b) => a + b, 0);

// Deterministic balanced five-point distributions. Variation is authored, not predictive.
export function responsesForScores(scores: Scores, count: number, department: string, prefix: string, createdAt: string): Response[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`, department, createdAt, fictional: true, source: 'submitted',
    answers: Object.fromEntries(RETENTION_FACTORS.map(({ key }, k) => {
      const average = 1 + Math.max(0, Math.min(100, scores[key])) / 25;
      const total = Math.round(average * count);
      const low = Math.floor(total / count);
      const rank = (i + k * 3) % count;
      let value = low + (rank < total % count ? 1 : 0);
      // Pairs broaden the distribution without changing the mean.
      if (rank === count - 2 && low > 1 && low < 5 && total % count <= count - 2) value--;
      if (rank === count - 1 && low > 1 && low < 5 && total % count <= count - 2) value++;
      return [key, value];
    })) as Scores,
  }));
}

/** Explicit destructive reset: only current practice-mode records; legacy storage is never touched. */
export function resetPractice(state: RetentionState): RetentionState {
  return { ...state, responses: state.responses.filter(r => r.source === 'demo'), plans: state.plans.filter(p => p.source === 'demo') };
}

/** Caller must confirm replacement of current practice surveys/plans before loading. */
export function loadPracticeOrganization(state: RetentionState, scenario: PracticeScenario): RetentionState {
  const reset = resetPractice(state);
  const responses = RETENTION_DEPARTMENTS.flatMap((department, i) => {
    const scores: Scores = scenario === 'favorable'
      ? { satisfaction: 85, workload: 80, support: 90, career: 80, stay: 85 }
      : { satisfaction: 60 + i * 2, workload: 40 + i * 3, support: 60 + i, career: 55 + i, stay: 55 + i * 2 };
    return responsesForScores(scores, scenario === 'small' ? 9 : 20, department, `fictional-baseline-${scenario}-${i}`, '2026-01-01T12:00:00.000Z');
  });
  return { ...reset, responses: [...reset.responses, ...responses] };
}

/** An explicit practice action, never called by start/complete. Replaces only generated followups for this plan. */
export function loadPracticeFollowup(state: RetentionState, planId: string, scenario: PracticeScenario, now = new Date().toISOString()): RetentionState {
  const plan = state.plans.find(p => p.id === planId);
  if (!plan?.baseline?.scores || !plan.startedAt) throw new Error('Start the plan before loading fictional follow-up responses.');
  if (plan.id === 'demo-nursing' || plan.id === 'demo-emergency') throw new Error('Predefined examples already contain fixed follow-up results. Create a new plan to practise.');
  const shift = scenario === 'improvement' ? 15 : scenario === 'worsening' ? -15 : 0;
  const scores = Object.fromEntries(RETENTION_FACTORS.map(({ key }) => [key,
    scenario === 'favorable' ? Math.max(80, plan.baseline!.scores![key]) : Math.max(0, Math.min(100, plan.baseline!.scores![key] + shift)),
  ])) as Scores;
  const prefix = `fictional-followup-${plan.id}`;
  const responses = responsesForScores(scores, scenario === 'small' ? 9 : 20, plan.department, prefix, now < plan.startedAt ? plan.startedAt : now)
    .map(r => ({ ...r, planId: plan.id, source: plan.source }));
  const existing = state.responses.filter(r => r.planId === plan.id && !r.id.startsWith(prefix));
  if (existing.length) throw new Error('This plan already has manually submitted follow-up responses. Use those results or create a separate plan to test fictional scenarios.');
  return { ...state, responses: [...state.responses.filter(r => !(r.planId === plan.id && r.id.startsWith(prefix))), ...responses] };
}
