export type FactorKey =
  | 'satisfaction'
  | 'commitment'
  | 'engagement'
  | 'workload'
  | 'career';

export type ScenarioKey = 'stable' | 'improving' | 'deteriorating';
export type FactorScores = Record<FactorKey, number>;

export type SurveyRecord = {
  department: string;
  month: string;
  answers: Record<FactorKey, number>;
  datasetSeed?: number;
};

export type Observation = {
  month: string;
  factors: FactorScores;
  score: number;
  turnovers: number;
  rate: number;
  activeEmployees: number;
  wsm: number | null;
  wma: number | null;
};

export type DepartmentProfile = {
  name: string;
  size: number;
  baseline: FactorScores;
};

export type Department = DepartmentProfile & {
  trendPattern: string;
  history: Observation[];
};

export type SyntheticEmployee = {
  id: string;
  department: string;
  monthlyFactors: FactorScores[];
  voluntaryExitMonth: number | null;
};

export type SyntheticDataset = {
  seed: number;
  scenario: ScenarioKey;
  employees: SyntheticEmployee[];
  departments: Department[];
};

export const DEFAULT_SEED = 0x52455441;

export const MONTHS = [
  'Apr 24',
  'May 24',
  'Jun 24',
  'Jul 24',
  'Aug 24',
  'Sep 24',
  'Oct 24',
  'Nov 24',
  'Dec 24',
  'Jan 25',
  'Feb 25',
  'Mar 25',
];

export const FORECAST_MONTHS = [
  'Apr 25',
  'May 25',
  'Jun 25',
  'Jul 25',
  'Aug 25',
  'Sep 25',
];

export const FACTOR_WEIGHTS: Record<FactorKey, number> = {
  satisfaction: 0.25,
  commitment: 0.25,
  engagement: 0.2,
  workload: 0.2,
  career: 0.1,
};

export const DEPARTMENT_PROFILES: DepartmentProfile[] = [
  {
    name: 'Emergency Services',
    size: 82,
    baseline: { satisfaction: 62, commitment: 65, engagement: 68, workload: 48, career: 57 },
  },
  {
    name: 'Nursing',
    size: 126,
    baseline: { satisfaction: 66, commitment: 69, engagement: 72, workload: 54, career: 61 },
  },
  {
    name: 'Critical Care',
    size: 58,
    baseline: { satisfaction: 59, commitment: 67, engagement: 70, workload: 46, career: 55 },
  },
  {
    name: 'Surgical Services',
    size: 64,
    baseline: { satisfaction: 70, commitment: 72, engagement: 73, workload: 63, career: 65 },
  },
  {
    name: 'Diagnostic Imaging',
    size: 48,
    baseline: { satisfaction: 74, commitment: 75, engagement: 76, workload: 69, career: 70 },
  },
  {
    name: 'Pharmacy',
    size: 42,
    baseline: { satisfaction: 71, commitment: 73, engagement: 70, workload: 66, career: 64 },
  },
  {
    name: 'Outpatient Care',
    size: 56,
    baseline: { satisfaction: 76, commitment: 77, engagement: 78, workload: 73, career: 71 },
  },
  {
    name: 'Administration',
    size: 44,
    baseline: { satisfaction: 78, commitment: 76, engagement: 74, workload: 75, career: 73 },
  },
];

export const SCENARIOS: {
  key: ScenarioKey;
  label: string;
  trajectory: number[];
  turnoverMultiplier: number;
  conclusion: string;
  explanation: string;
  actions: string[];
}[] = [
  {
    key: 'deteriorating',
    label: 'Declining Conditions',
    trajectory: [0, -0.2, -0.5, -0.9, -1.4, -2, -2.7, -3.5, -4.4, -5.4, -6.5, -7.7],
    turnoverMultiplier: 1.35,
    conclusion: 'Workplace conditions are declining.',
    explanation: 'The weighted score falls each month, and the monthly decrease grows over time.',
    actions: [
      'Ask staff which workload or handoff pressures have changed most.',
      'Agree on one short-term support change and check back next month.',
    ],
  },
  {
    key: 'improving',
    label: 'Improving Conditions',
    trajectory: [0, 0.4, 0.8, 1.2, 1.6, 2, 2.4, 2.8, 3.2, 3.6, 4, 4.4],
    turnoverMultiplier: 0.7,
    conclusion: 'Workplace conditions are improving.',
    explanation: 'The weighted score rises steadily across the 12-month example.',
    actions: [
      'Ask teams which recent changes are helping and why.',
      'Keep the useful practices in place and check that gains reach every shift.',
    ],
  },
  {
    key: 'stable',
    label: 'Stable Conditions',
    trajectory: [0, 0.1, 0, 0.1, 0.2, 0.1, 0, 0.1, 0.2, 0.1, 0, 0.1],
    turnoverMultiplier: 1,
    conclusion: 'Workplace conditions are staying nearly constant.',
    explanation: 'The weighted score varies by only a few tenths of a point across the year.',
    actions: [
      'Continue regular listening checks instead of assuming stable scores mean no concerns.',
      'Review lower-scoring factors with staff and keep monitoring workload.',
    ],
  },
];

const FACTOR_KEYS: FactorKey[] = [
  'satisfaction',
  'commitment',
  'engagement',
  'workload',
  'career',
];

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedScore(factors: FactorScores): number {
  return Math.round(
    FACTOR_KEYS.reduce((sum, key) => sum + factors[key] * FACTOR_WEIGHTS[key], 0) * 10,
  ) / 10;
}

export function deriveMomentum(history: Observation[]): Observation[] {
  const scored = history.map((observation) => ({
    ...observation,
    score: weightedScore(observation.factors),
  }));
  const monthlyChanges = scored.map((observation, index) =>
    index > 0
      ? Math.round((observation.score - scored[index - 1].score) * 10) / 10
      : null,
  );

  return scored.map((observation, index) => {
    const wsm = monthlyChanges[index];
    const wma =
      index > 1 && wsm !== null
        ? Math.round((wsm - (monthlyChanges[index - 1] ?? 0)) * 10) / 10
        : null;
    return { ...observation, wsm, wma };
  });
}

export function generateSyntheticDataset(
  seed: number,
  scenario: ScenarioKey,
): SyntheticDataset {
  const random = seededRandom(seed);
  const outcomeRandom = seededRandom((seed ^ 0xa5a5a5a5) >>> 0);
  const scenarioConfig = SCENARIOS.find((item) => item.key === scenario) ?? SCENARIOS[0];
  const employees: SyntheticEmployee[] = [];

  DEPARTMENT_PROFILES.forEach((department, departmentIndex) => {
    for (let employeeIndex = 0; employeeIndex < department.size; employeeIndex += 1) {
      const individualOffsets = {} as FactorScores;
      FACTOR_KEYS.forEach((key) => {
        individualOffsets[key] = (random() - 0.5) * 16;
      });
      const monthlyFactors = MONTHS.map((_, monthIndex) => {
        const factors = {} as FactorScores;
        FACTOR_KEYS.forEach((key) => {
          factors[key] = Math.round(
            clamp(department.baseline[key] + scenarioConfig.trajectory[monthIndex] + individualOffsets[key]),
          );
        });
        return factors;
      });

      let voluntaryExitMonth: number | null = null;
      for (let monthIndex = 0; monthIndex < monthlyFactors.length; monthIndex += 1) {
        const scores = monthlyFactors[monthIndex];
        const score = weightedScore(scores);
        const probability = clamp(
          0.004 +
            Math.max(0, 68 - score) * 0.00045 +
            Math.max(0, 58 - scores.workload) * 0.0002,
          0.002,
          0.025,
        );
        if (outcomeRandom() < probability) {
          voluntaryExitMonth = monthIndex;
          break;
        }
      }

      employees.push({
        id: `SYN-${String(departmentIndex + 1).padStart(2, '0')}-${String(
          employeeIndex + 1,
        ).padStart(3, '0')}`,
        department: department.name,
        monthlyFactors,
        voluntaryExitMonth,
      });
    }
  });

  const departments = DEPARTMENT_PROFILES.map((profile, departmentIndex) => {
    const members = employees.filter((employee) => employee.department === profile.name);
    const history = MONTHS.map((month, monthIndex): Observation => {
      const factors = {} as FactorScores;
      FACTOR_KEYS.forEach((key) => {
        factors[key] = clamp(
          profile.baseline[key] + scenarioConfig.trajectory[monthIndex],
        );
      });
      const turnovers = members.filter(
        (employee) => employee.voluntaryExitMonth === monthIndex,
      ).length;
      return {
        month,
        factors,
        score: weightedScore(factors),
        turnovers,
        rate: (turnovers / profile.size) * 100,
        activeEmployees: members.filter(
          (employee) => employee.voluntaryExitMonth === null || employee.voluntaryExitMonth >= monthIndex,
        ).length,
        wsm: null,
        wma: null,
      };
    });

    return {
      ...profile,
      trendPattern: scenarioConfig.label,
      history: deriveMomentum(history),
    };
  });

  return { seed: seed >>> 0, scenario, employees, departments };
}

export function getDepartmentMetrics(
  departmentName: string,
  dataset: SyntheticDataset,
  surveys: SurveyRecord[],
) {
  const department = dataset.departments.find((item) => item.name === departmentName);
  if (!department) throw new Error(`Unknown department: ${departmentName}`);

  const history = department.history.map((observation) => ({
    ...observation,
    factors: { ...observation.factors },
  }));
  const latestMonth = MONTHS[MONTHS.length - 1];
  const group = surveys.filter(
    (survey) =>
      survey.department === departmentName &&
      survey.month === latestMonth &&
      (survey.datasetSeed ?? DEFAULT_SEED) === dataset.seed,
  );

  if (group.length >= 10) {
    FACTOR_KEYS.forEach((key) => {
      history[history.length - 1].factors[key] =
        group.reduce(
          (sum, entry) => sum + (entry.answers[key] - 1) * 25,
          0,
        ) / group.length;
    });
  }

  const derivedHistory = deriveMomentum(history);
  return {
    history: derivedHistory,
    wsm: derivedHistory.map((observation) => observation.wsm),
    wma: derivedHistory.map((observation) => observation.wma),
    surveyCount: group.length,
    latest: derivedHistory[derivedHistory.length - 1],
  };
}

export function computeForecast(
  departmentName: string,
  dataset: SyntheticDataset,
  surveys: SurveyRecord[],
) {
  const department = dataset.departments.find((item) => item.name === departmentName);
  if (!department) throw new Error(`Unknown department: ${departmentName}`);

  const metrics = getDepartmentMetrics(departmentName, dataset, surveys);
  const recentHistory = metrics.history.slice(-3);
  const recentRate =
    recentHistory.reduce((sum, observation) => sum + observation.rate, 0) /
    recentHistory.length;
  const latestWsm = metrics.wsm.at(-1) ?? 0;
  const latestWma = metrics.wma.at(-1) ?? 0;
  const adjustedRate = Math.max(
    0.1,
    recentRate +
      (65 - metrics.latest.score) * 0.012 -
      latestWsm * 0.006 -
      latestWma * 0.003,
  );
  const scenarioMultiplier =
    SCENARIOS.find((item) => item.key === dataset.scenario)?.turnoverMultiplier ?? 1;

  return FORECAST_MONTHS.map((month, index) => {
    const rate = Math.max(0.1, adjustedRate * scenarioMultiplier + (index + 1) * 0.015);
    const turnovers = Math.max(0, Math.round((department.size * rate) / 100));
    return { month, rate: (turnovers / department.size) * 100, turnovers, simulated: true };
  });
}

export function getSelectionSummary(
  departmentNames: string[],
  dataset: SyntheticDataset,
  surveys: SurveyRecord[],
) {
  if (departmentNames.length === 0) {
    throw new Error('At least one department must be selected.');
  }

  const selectedDepartments = departmentNames.map((name) => {
    const department = dataset.departments.find((item) => item.name === name);
    if (!department) throw new Error(`Unknown department: ${name}`);
    return {
      department,
      metrics: getDepartmentMetrics(name, dataset, surveys),
    };
  });
  const headcount = selectedDepartments.reduce(
    (sum, item) => sum + item.department.size,
    0,
  );

  const history = deriveMomentum(
    MONTHS.map((month, monthIndex): Observation => {
      const turnovers = selectedDepartments.reduce(
        (sum, item) => sum + item.metrics.history[monthIndex].turnovers,
        0,
      );
      const factors = {} as FactorScores;
      FACTOR_KEYS.forEach((key) => {
        factors[key] =
          selectedDepartments.reduce(
            (sum, item) =>
              sum + item.metrics.history[monthIndex].factors[key] * item.department.size,
            0,
          ) / headcount;
      });
      return {
        month,
        factors,
        score: 0,
        turnovers,
        rate: (turnovers / headcount) * 100,
        activeEmployees: selectedDepartments.reduce(
          (sum, item) => sum + item.metrics.history[monthIndex].activeEmployees,
          0,
        ),
        wsm: null,
        wma: null,
      };
    }),
  );

  const departmentForecasts = selectedDepartments.map(({ department }) =>
    computeForecast(department.name, dataset, surveys),
  );
  const forecast = FORECAST_MONTHS.map((month, monthIndex) => {
    const turnovers = departmentForecasts.reduce(
      (sum, months) => sum + months[monthIndex].turnovers,
      0,
    );
    return {
      month,
      turnovers,
      rate: (turnovers / headcount) * 100,
      simulated: true,
    };
  });

  return {
    headcount,
    history,
    latest: history[history.length - 1],
    wsm: history.map((observation) => observation.wsm),
    wma: history.map((observation) => observation.wma),
    forecast,
    forecastExits: forecast.reduce((sum, month) => sum + month.turnovers, 0),
  };
}

const STABLE_WSM_THRESHOLD = 0.18;
const SIGNIFICANT_WMA_THRESHOLD = 0.05;

export function getTrendLabel(wsm: number, wma: number) {
  if (Math.abs(wsm) < STABLE_WSM_THRESHOLD) return 'Stable';
  if (wsm < 0 && wma < -SIGNIFICANT_WMA_THRESHOLD) return 'Decline accelerating';
  if (wsm < 0 && wma > SIGNIFICANT_WMA_THRESHOLD) return 'Decline slowing';
  if (wsm > 0 && wma > SIGNIFICANT_WMA_THRESHOLD) return 'Improving';
  if (wsm > 0 && wma < -SIGNIFICANT_WMA_THRESHOLD) return 'Improvement slowing';
  return wsm > 0 ? 'Improving' : 'Declining';
}
