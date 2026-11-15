import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addResponse, aggregate, departmentAggregate, exampleResponses, followupAggregate,
  initialRetentionState, isRetentionState, lowestFactors, recommend, resetExamples, savePlan,
  RETENTION_DEPARTMENTS, RETENTION_FACTORS, type Plan, type Response,
} from './retention.ts';

const answer = (id: string, rating = 3, planId?: string): Response => ({
  id, department: 'Nursing', createdAt: '2026-11-11T12:00:00.000Z', planId,
  answers: { satisfaction: rating, workload: rating, support: rating, career: rating, stay: rating },
});
const plan = (overrides: Partial<Plan> = {}): Plan => ({
  id: 'new-plan', department: 'Nursing', strategyId: 'workload-scheduling',
  responsible: 'Nurse manager', startDate: '2026-11-11', endDate: '2026-12-11',
  target: 10, status: 'Planned', source: 'submitted', baseline: null, startedAt: null, ...overrides,
});

test('five-point conversion, suppression, and intention-to-stay separation', () => {
  for (const rating of [1, 2, 3, 4, 5]) {
    const responses = Array.from({ length: 10 }, (_, i) => answer(String(i), rating));
    assert.equal(aggregate(responses.slice(0, 9)).scores, null);
    assert.equal(aggregate(responses).scores?.stay, (rating - 1) * 25);
  }
  assert.equal(aggregate([]).scores, null);
  const scores = { satisfaction: 80, workload: 40, support: 60, career: 55, stay: 10 };
  assert.deepEqual(lowestFactors(scores).map(f => f.key), ['workload', 'career', 'support']);
  assert.equal(recommend(scores).length, 3);
  assert.equal(recommend(scores)[0].factor, 'workload');
});

test('fixed examples are reproducible five-point responses with improved and unchanged outcomes', () => {
  for (const department of RETENTION_DEPARTMENTS) {
    assert.deepEqual(exampleResponses(department), exampleResponses(department));
    assert.equal(exampleResponses(department).length, 20);
    assert.ok(exampleResponses(department).every(r => RETENTION_FACTORS.every(f => Number.isInteger(r.answers[f.key]) && r.answers[f.key] >= 1 && r.answers[f.key] <= 5)));
  }
  const state = initialRetentionState();
  const nursing = state.plans[0], emergency = state.plans[1];
  assert.equal(nursing.baseline?.scores?.workload, 40);
  assert.equal(followupAggregate(state, nursing).scores?.workload, 65);
  assert.deepEqual(emergency.baseline?.scores, followupAggregate(state, emergency).scores);
});

test('complete submitted workflow snapshots baseline and computes only submitted followup', () => {
  let state = initialRetentionState();
  for (let i = 0; i < 9; i++) state = addResponse(state, answer(`before-${i}`));
  state = savePlan(state, plan());
  assert.throws(() => savePlan(state, plan({ status: 'In Progress' })), /10 baseline/);
  state = addResponse(state, answer('before-9'));
  state = savePlan(state, plan({ status: 'In Progress' }), '2026-11-11T11:00:00.000Z');
  const started = state.plans.find(p => p.id === 'new-plan')!;
  assert.equal(started.baseline?.scores?.workload, 50);
  state = addResponse(state, answer('later-baseline', 1));
  assert.equal(state.plans.find(p => p.id === 'new-plan')?.baseline?.scores?.workload, 50);
  assert.equal(followupAggregate(state, started).scores, null);
  state = savePlan(state, { ...started, status: 'Completed' });
  assert.equal(followupAggregate(state, started).scores, null, 'Completion cannot fabricate improvements');
  for (let i = 0; i < 9; i++) state = addResponse(state, answer(`after-${i}`, 4, started.id));
  assert.equal(followupAggregate(state, started).scores, null);
  state = addResponse(state, answer('after-9', 4, started.id));
  assert.equal(followupAggregate(state, started).scores?.workload, 75);
  assert.equal(departmentAggregate(state, 'Nursing', 'submitted').count, 11, 'Followups excluded from baseline pool');
  assert.equal(departmentAggregate(state, 'Emergency', 'submitted').scores, null);
  assert.throws(() => savePlan(state, { ...started, department: 'Emergency' }), /locked/);
  assert.throws(() => savePlan(state, { ...started, status: 'Planned' }), /cannot return/);
  assert.throws(() => savePlan(state, { ...started, strategyId: 'career-pathways' }), /locked/);
  state = savePlan(state, { ...started, endDate: '2027-01-10', status: 'In Progress' });
  assert.equal(state.plans.find(p => p.id === started.id)?.baseline?.scores?.workload, 50);
});

test('invalid inputs rejected and followups cannot bypass plan or source boundaries', () => {
  const state = initialRetentionState();
  assert.throws(() => addResponse(state, answer('bad', 0)), /answer all five/);
  assert.throws(() => addResponse(state, answer('bad', 3.5)), /answer all five/);
  assert.throws(() => addResponse(state, answer('bad', 3, 'missing')), /started/);
  assert.throws(() => addResponse(state, answer('bad', 3, 'demo-nursing')), /started/);
  assert.throws(() => savePlan(state, plan({ status: 'Completed' })), /Start/);
  assert.throws(() => savePlan(state, plan({ target: NaN })), /target/);
  assert.throws(() => savePlan(state, plan({ endDate: '2026-11-10' })), /End date/);
  assert.throws(() => savePlan(state, plan({ responsible: '' })), /responsible/);
});

test('reset preserves submitted responses and user-created plans without mixing sources', () => {
  let state = addResponse(initialRetentionState(), answer('keep'));
  state = savePlan(state, plan());
  state = savePlan(state, plan({ id: 'my-demo', source: 'demo', status: 'In Progress' }));
  const demoPlan = state.plans.find(p => p.id === 'my-demo')!;
  assert.equal(followupAggregate(state, demoPlan).scores, null, 'Only authored examples include example followup');
  const reset = resetExamples(state);
  assert.deepEqual(reset.responses, state.responses);
  assert.deepEqual(reset.plans.filter(p => !p.id.startsWith('demo-')), state.plans.filter(p => !p.id.startsWith('demo-')));
  assert.equal(departmentAggregate(reset, 'Nursing', 'submitted').count, 1);
  assert.equal(departmentAggregate(reset, 'Nursing', 'demo').count, 20);
});

test('storage validation rejects malformed scores, dates, snapshots and unknown strategies', () => {
  const state = initialRetentionState();
  assert.equal(isRetentionState(state), true);
  assert.equal(isRetentionState({ ...state, responses: [{ ...answer('broken'), answers: {} }] }), false);
  assert.equal(isRetentionState({ ...state, responses: [answer('bad', 9)] }), false);
  assert.equal(isRetentionState({ ...state, plans: [{ ...state.plans[0], strategyId: 'missing' }] }), false);
  assert.equal(isRetentionState({ ...state, plans: [{ ...state.plans[0], baseline: { count: 9, scores: state.plans[0].baseline!.scores } }] }), false);
  assert.throws(() => savePlan(state, plan({ startDate: '2026-02-30' })), /calendar/);
  const next = savePlan(state, plan({ source: 'demo', status: 'In Progress' }));
  assert.equal(isRetentionState(next), true);
});
