import {
  DEFAULT_SEED,
  generateSyntheticDataset,
  SCENARIOS,
  type ScenarioKey,
  type SyntheticDataset,
  type SurveyRecord,
} from './synthetic-data.ts';

export type SurveyEntry = SurveyRecord & { createdAt: string };
export type TaskEntry = {
  task: string;
  success: string;
  seconds: string;
  errors: string;
  comments: string;
  savedAt: string;
};
export type PeerEntry = {
  strengths: string;
  risks: string;
  suggestions: string;
  rating: string;
  savedAt: string;
};
export type Persisted = {
  surveys: SurveyEntry[];
  tasks: TaskEntry[];
  reviews: PeerEntry[];
};

export type DemoStoreState = {
  data: Persisted;
  dataset: SyntheticDataset;
  scenarioChoice: ScenarioKey;
  datasetNotice: string;
};

export type DemoStoreAction =
  | {
      type: 'set-data';
      value: Persisted | ((old: Persisted) => Persisted);
    }
  | { type: 'choose-scenario'; scenario: ScenarioKey }
  | { type: 'generate-dataset'; seed: number }
  | { type: 'reset-demo' };

export function createDemoStoreState(
  data: Persisted,
  dataset: SyntheticDataset,
): DemoStoreState {
  return {
    data,
    dataset,
    scenarioChoice: dataset.scenario,
    datasetNotice: '',
  };
}

export function demoStoreReducer(
  state: DemoStoreState,
  action: DemoStoreAction,
): DemoStoreState {
  switch (action.type) {
    case 'set-data':
      return {
        ...state,
        data:
          typeof action.value === 'function'
            ? action.value(state.data)
            : action.value,
      };
    case 'choose-scenario':
      {
        const seed = (state.dataset.seed + 1) >>> 0;
        return {
          ...state,
          scenarioChoice: action.scenario,
          dataset: generateSyntheticDataset(seed, action.scenario),
          datasetNotice: `${SCENARIOS.find((item) => item.key === action.scenario)?.label} example selected. Saved records were preserved; survey responses from the prior seed do not affect this scenario.`,
        };
      }
    case 'generate-dataset':
      return {
        ...state,
        dataset: generateSyntheticDataset(action.seed, state.scenarioChoice),
        datasetNotice: `New ${SCENARIOS.find((item) => item.key === state.scenarioChoice)?.label.toLowerCase()} dataset created. Existing survey, tester, and peer-review records were preserved.`,
      };
    case 'reset-demo':
      return {
        ...state,
        dataset: generateSyntheticDataset(DEFAULT_SEED, 'stable'),
        scenarioChoice: 'stable',
        datasetNotice: `Original stable dataset restored (fixed seed ${DEFAULT_SEED}). Existing records were preserved.`,
      };
  }
}
