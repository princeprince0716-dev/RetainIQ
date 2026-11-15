import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDemoStoreState,
  demoStoreReducer,
  type Persisted,
} from './demo-store.ts';
import {
  DEFAULT_SEED,
  generateSyntheticDataset,
} from './synthetic-data.ts';

const savedRecords: Persisted = {
  surveys: [
    {
      department: 'Nursing',
      month: 'Mar 25',
      answers: {
        satisfaction: 4,
        commitment: 3,
        engagement: 5,
        workload: 2,
        career: 4,
      },
      createdAt: '2025-03-01T00:00:00.000Z',
      datasetSeed: DEFAULT_SEED,
    },
  ],
  tasks: [
    {
      task: 'Find the department with the highest simulated forecast.',
      success: 'Completed',
      seconds: '42',
      errors: 'None',
      comments: 'Clear labels',
      savedAt: '2025-03-02T00:00:00.000Z',
    },
  ],
  reviews: [
    {
      strengths: 'Clear explanation',
      risks: 'Small sample groups',
      suggestions: 'Add context',
      rating: 'Needs work',
      savedAt: '2025-03-03T00:00:00.000Z',
    },
    {
      strengths: 'Useful comparisons',
      risks: 'Synthetic-only data',
      suggestions: 'Keep limitations visible',
      rating: 'Review further',
      savedAt: '2025-03-04T00:00:00.000Z',
    },
  ],
};

test('scenario selection updates the dataset immediately and new seeds preserve every saved record', () => {
  let state = createDemoStoreState(
    savedRecords,
    generateSyntheticDataset(DEFAULT_SEED, 'stable'),
  );

  state = demoStoreReducer(state, {
    type: 'choose-scenario',
    scenario: 'deteriorating',
  });
  assert.equal(state.dataset.scenario, 'deteriorating');
  assert.equal(state.dataset.seed, DEFAULT_SEED + 1);
  assert.match(state.datasetNotice, /Declining Conditions/);
  state = demoStoreReducer(state, {
    type: 'generate-dataset',
    seed: DEFAULT_SEED + 7,
  });

  assert.equal(state.dataset.scenario, 'deteriorating');
  assert.equal(state.dataset.seed, DEFAULT_SEED + 7);
  assert.deepEqual(state.data, savedRecords);
});

test('Reset Demo restores the fixed stable seed and preserves all saved records', () => {
  let state = createDemoStoreState(
    savedRecords,
    generateSyntheticDataset(DEFAULT_SEED + 7, 'improving'),
  );
  state = demoStoreReducer(state, {
    type: 'choose-scenario',
    scenario: 'deteriorating',
  });
  state = demoStoreReducer(state, { type: 'reset-demo' });

  assert.equal(state.dataset.seed, DEFAULT_SEED);
  assert.equal(state.dataset.scenario, 'stable');
  assert.equal(state.scenarioChoice, 'stable');
  assert.deepEqual(state.data, savedRecords);
});
