import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregate, departmentAggregate, followupAggregate, initialRetentionState, isRetentionState, savePlan, type Plan, RETENTION_FACTORS } from './retention.ts';
import { HEADCOUNTS, loadPracticeFollowup, loadPracticeOrganization, ORGANIZATION_HEADCOUNT, PRACTICE_SCENARIOS, resetPractice } from './practice.ts';

const draft: Plan = {
  id: 'practice-plan', department: 'Nursing', strategyId: 'workload-scheduling',
  responsible: 'Charge nurse', startDate: '2026-11-01', endDate: '2026-12-01',
  target: 10, status: 'In Progress', source: 'submitted', baseline: null, startedAt: null,
};

test('500 headcount is distinct from reproducible five-point survey responses', () => {
  assert.equal(ORGANIZATION_HEADCOUNT, 500);
  assert.equal(HEADCOUNTS.length, 8);
  for (const { key } of PRACTICE_SCENARIOS) {
    const a = loadPracticeOrganization(initialRetentionState(), key);
    assert.deepEqual(a, loadPracticeOrganization(initialRetentionState(), key));
    assert.equal(a.responses.length, key === 'small' ? 72 : 160);
    assert.ok(a.responses.every(r => r.fictional && RETENTION_FACTORS.every(f => Number.isInteger(r.answers[f.key]) && r.answers[f.key] >= 1 && r.answers[f.key] <= 5)));
    assert.equal(isRetentionState(a), true);
  }
});

test('all newly started plans support explicit fictional improvement, no change, worsening, and small samples', () => {
  let state = loadPracticeOrganization(initialRetentionState(), 'improvement');
  state = savePlan(state, draft, '2026-11-01T12:00:00.000Z');
  const started = state.plans.find(p => p.id === draft.id)!;
  const baseline = structuredClone(started.baseline);
  assert.equal(followupAggregate(state, started).scores, null);
  for (const [scenario, expected] of [['improvement', 15], ['unchanged', 0], ['worsening', -15]] as const) {
    state = loadPracticeFollowup(state, draft.id, scenario, '2026-12-01T12:00:00.000Z');
    const followup = followupAggregate(state, started);
    assert.equal(followup.count, 20);
    for (const { key } of RETENTION_FACTORS) assert.equal(followup.scores![key] - baseline!.scores![key], expected);
    assert.deepEqual(state.plans.find(p => p.id === draft.id)!.baseline, baseline);
    assert.equal(isRetentionState(state), true);
  }
  state = loadPracticeFollowup(state, draft.id, 'small');
  assert.equal(followupAggregate(state, started).count, 9);
  assert.equal(followupAggregate(state, started).scores, null);
  const response = { ...state.responses.find(r => r.planId === draft.id)!, id: 'tenth', fictional: false };
  state = { ...state, responses: [...state.responses, response] };
  assert.ok(followupAggregate(state, started).scores);
  assert.throws(() => loadPracticeFollowup(state, draft.id, 'improvement'), /manually submitted/);
  const beforeComplete = structuredClone(state.responses);
  state = savePlan(state, { ...started, status: 'Completed' });
  assert.deepEqual(state.responses, beforeComplete);
});

test('example and practice modes never mix; reset preserves example plans and their responses', () => {
  let state = loadPracticeOrganization(initialRetentionState(), 'improvement');
  state = savePlan(state, { ...draft, id: 'new-example', source: 'demo' });
  state = loadPracticeFollowup(state, 'new-example', 'worsening');
  state = savePlan(state, draft);
  state = loadPracticeFollowup(state, draft.id, 'improvement');
  assert.equal(departmentAggregate(state, 'Nursing', 'submitted').count, 20);
  assert.equal(departmentAggregate(state, 'Nursing', 'demo').count, 20);
  const examplePlans = state.plans.filter(p => p.source === 'demo');
  const exampleResponses = state.responses.filter(r => r.source === 'demo');
  const reset = resetPractice(state);
  assert.deepEqual(reset.plans, examplePlans);
  assert.deepEqual(reset.responses, exampleResponses);
  assert.equal(departmentAggregate(reset, 'Nursing', 'submitted').count, 0);
  assert.equal(isRetentionState(reset), true);
});

test('small-sample baseline cannot start, favorable scores remain high, old records remain valid', () => {
  const small = loadPracticeOrganization(initialRetentionState(), 'small');
  assert.equal(departmentAggregate(small, 'Nursing', 'submitted').scores, null);
  assert.throws(() => savePlan(small, draft), /10 baseline/);
  const high = loadPracticeOrganization(initialRetentionState(), 'favorable');
  assert.ok(Object.values(departmentAggregate(high, 'Nursing', 'submitted').scores!).every(s => s >= 80));
  assert.equal(isRetentionState(initialRetentionState()), true);
  assert.equal(aggregate([]).scores, null);
});
