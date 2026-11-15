import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeForecast,
  DEFAULT_SEED,
  DEPARTMENT_PROFILES,
  FACTOR_WEIGHTS,
  generateSyntheticDataset,
  getDepartmentMetrics,
  getSelectionSummary,
  getTrendLabel,
  MONTHS,
  SCENARIOS,
  type FactorKey,
} from './synthetic-data.ts';

const noSurveys = [];
const roundOneDecimal = (value: number) => Math.round(value * 10) / 10;
const departmentNames = DEPARTMENT_PROFILES.map((department) => department.name);

function weightedOrganizationScore(
  dataset: ReturnType<typeof generateSyntheticDataset>,
  monthIndex: number,
) {
  const total = dataset.departments.reduce((sum, department) => sum + department.size, 0);
  return (
    dataset.departments.reduce(
      (sum, department) => sum + department.history[monthIndex].score * department.size,
      0,
    ) / total
  );
}

test('the fixed seed repeats employee scores and turnover outcomes', () => {
  const first = generateSyntheticDataset(DEFAULT_SEED, 'stable');
  const second = generateSyntheticDataset(DEFAULT_SEED, 'stable');
  assert.deepEqual(first, second);
});

test('all three scenarios use clear, reproducible 12-month score trajectories', () => {
  const generated = Object.fromEntries(
    SCENARIOS.map(({ key }) => [key, generateSyntheticDataset(DEFAULT_SEED, key)]),
  );

  for (const dataset of Object.values(generated)) {
    assert.equal(dataset.departments.length, DEPARTMENT_PROFILES.length);
    assert.equal(dataset.employees.length, DEPARTMENT_PROFILES.reduce((sum, department) => sum + department.size, 0));
    for (const department of dataset.departments) {
      assert.equal(department.history.length, MONTHS.length);
    }
    for (const employee of dataset.employees) {
      assert.equal(employee.monthlyFactors.length, MONTHS.length);
    }
  }

  const stable = generated.stable!;
  const improving = generated.improving!;
  const deteriorating = generated.deteriorating!;
  const scores = (dataset: typeof stable) =>
    MONTHS.map((_, index) => weightedOrganizationScore(dataset, index));
  const stableScores = scores(stable).map(roundOneDecimal);
  const improvingScores = scores(improving);
  const decliningScores = scores(deteriorating);
  const changes = (values: number[]) => values.slice(1).map((value, index) => roundOneDecimal(value - values[index]));

  assert.ok(changes(decliningScores).every((change) => change < 0));
  assert.ok(changes(decliningScores).every((change, index, series) => index === 0 || change < series[index - 1]));
  assert.ok(changes(improvingScores).every((change) => change > 0));
  assert.ok(Math.max(...stableScores) - Math.min(...stableScores) <= 0.2000001);
  assert.ok(weightedOrganizationScore(improving, 11) > weightedOrganizationScore(stable, 11));
  assert.ok(weightedOrganizationScore(deteriorating, 11) < weightedOrganizationScore(stable, 11));
  assert.deepEqual(
    generateSyntheticDataset(DEFAULT_SEED + 1, 'improving').departments.map((department) => department.history.map((month) => month.score)),
    improving.departments.map((department) => department.history.map((month) => month.score)),
  );
  const exitCount = (dataset: (typeof stable)) =>
    dataset.employees.filter((employee) => employee.voluntaryExitMonth !== null).length;
  assert.ok(exitCount(improving) < exitCount(stable));
  assert.ok(exitCount(deteriorating) > exitCount(stable));
  const forecasts = Object.fromEntries(
    Object.entries(generated).map(([key, dataset]) => [
      key,
      getSelectionSummary(departmentNames, dataset!, noSurveys).forecastExits,
    ]),
  );
  assert.ok(forecasts.improving! < forecasts.stable!);
  assert.ok(forecasts.stable! < forecasts.deteriorating!);
});

test('department and organization WSM/WMA are derived from their monthly weighted scores', () => {
  const dataset = generateSyntheticDataset(DEFAULT_SEED, 'stable');
  const selections = [
    ...departmentNames.map((name) => [name]),
    departmentNames,
  ];

  for (const selectedNames of selections) {
    const summary = getSelectionSummary(selectedNames, dataset, noSurveys);
    assert.equal(summary.history.length, MONTHS.length);

    summary.history.forEach((observation, index) => {
      const expectedWsm =
        index === 0
          ? null
          : roundOneDecimal(observation.score - summary.history[index - 1].score);
      const expectedWma =
        index < 2
          ? null
          : roundOneDecimal(
              (expectedWsm ?? 0) - (summary.history[index - 1].wsm ?? 0),
            );
      assert.equal(observation.wsm, expectedWsm);
      assert.equal(observation.wma, expectedWma);
    });
  }

  for (const name of departmentNames) {
    const singleDepartment = getSelectionSummary([name], dataset, noSurveys);
    const departmentMetrics = getDepartmentMetrics(name, dataset, noSurveys);
    assert.deepEqual(
      singleDepartment.history.map((observation) => observation.score),
      departmentMetrics.history.map((observation) => observation.score),
    );
  }
});

test('workforce labels honor the WSM stable cutoff on both sides', () => {
  const cases = [
    { wsm: -0.181, expected: 'Declining' },
    { wsm: -0.18, expected: 'Declining' },
    { wsm: -0.179, expected: 'Stable' },
    { wsm: 0.179, expected: 'Stable' },
    { wsm: 0.18, expected: 'Improving' },
    { wsm: 0.181, expected: 'Improving' },
  ] as const;

  for (const { wsm, expected } of cases) {
    assert.equal(getTrendLabel(wsm, 0), expected, `WSM ${wsm}`);
  }
});

test('workforce labels honor both WMA cutoffs for positive momentum', () => {
  const cases = [
    { wma: -0.051, expected: 'Improvement slowing' },
    { wma: -0.05, expected: 'Improving' },
    { wma: -0.049, expected: 'Improving' },
    { wma: 0.049, expected: 'Improving' },
    { wma: 0.05, expected: 'Improving' },
    { wma: 0.051, expected: 'Improving' },
  ] as const;

  for (const { wma, expected } of cases) {
    assert.equal(getTrendLabel(0.2, wma), expected, `WMA ${wma}`);
  }
});

test('workforce labels honor both WMA cutoffs for negative momentum', () => {
  const cases = [
    { wma: -0.051, expected: 'Decline accelerating' },
    { wma: -0.05, expected: 'Declining' },
    { wma: -0.049, expected: 'Declining' },
    { wma: 0.049, expected: 'Declining' },
    { wma: 0.05, expected: 'Declining' },
    { wma: 0.051, expected: 'Decline slowing' },
  ] as const;

  for (const { wma, expected } of cases) {
    assert.equal(getTrendLabel(-0.2, wma), expected, `WMA ${wma}`);
  }
});

test('positive and negative momentum combinations keep their intended labels', () => {
  assert.equal(getTrendLabel(0.2, 0.1), 'Improving');
  assert.equal(getTrendLabel(0.2, -0.1), 'Improvement slowing');
  assert.equal(getTrendLabel(-0.2, -0.1), 'Decline accelerating');
  assert.equal(getTrendLabel(-0.2, 0.1), 'Decline slowing');
});

test('six-month selection turnover equals the sum of department outcomes', () => {
  const dataset = generateSyntheticDataset(DEFAULT_SEED, 'stable');
  const summary = getSelectionSummary(departmentNames, dataset, noSurveys);

  assert.equal(summary.forecast.length, 6);
  assert.equal(
    summary.forecastExits,
    departmentNames.reduce(
      (sum, name) =>
        sum +
        computeForecast(name, dataset, noSurveys).reduce(
          (departmentTotal, month) => departmentTotal + month.turnovers,
          0,
        ),
      0,
    ),
  );
  assert.deepEqual(
    summary.forecast.map((month) => month.turnovers),
    [2, 2, 2, 2, 2, 2],
  );

  const repeated = getSelectionSummary(
    departmentNames,
    generateSyntheticDataset(DEFAULT_SEED, 'stable'),
    noSurveys,
  );
  assert.deepEqual(summary.forecast, repeated.forecast);
});

test('monthly composite scores use the configured weighted factors', () => {
  const dataset = generateSyntheticDataset(DEFAULT_SEED, 'stable');
  const factorKeys = Object.keys(FACTOR_WEIGHTS) as FactorKey[];
  const summary = getSelectionSummary(departmentNames, dataset, noSurveys);

  for (const observation of summary.history) {
    const score = factorKeys.reduce(
      (total, key) => total + observation.factors[key] * FACTOR_WEIGHTS[key],
      0,
    );
    assert.equal(observation.score, roundOneDecimal(score));
  }
});

test('survey factors change only at ten active-seed responses and roll up organization-wide', () => {
  const dataset = generateSyntheticDataset(DEFAULT_SEED, 'stable');
  const department = DEPARTMENT_PROFILES[0];
  const makeSurveys = (count: number) =>
    Array.from({ length: count }, () => ({
      department: department.name,
      month: MONTHS.at(-1)!,
      datasetSeed: dataset.seed,
      answers: {
        satisfaction: 5,
        commitment: 5,
        engagement: 5,
        workload: 5,
        career: 5,
      },
    }));

  const syntheticMetrics = getDepartmentMetrics(department.name, dataset, noSurveys);
  const belowThreshold = getDepartmentMetrics(department.name, dataset, makeSurveys(9));
  assert.equal(belowThreshold.surveyCount, 9);
  assert.deepEqual(belowThreshold.latest.factors, syntheticMetrics.latest.factors);

  const eligibleSurveys = makeSurveys(10);
  const updatedMetrics = getDepartmentMetrics(department.name, dataset, eligibleSurveys);
  assert.equal(updatedMetrics.surveyCount, 10);
  assert.deepEqual(
    updatedMetrics.latest.factors,
    {
      satisfaction: 100,
      commitment: 100,
      engagement: 100,
      workload: 100,
      career: 100,
    },
  );

  const originalOrganization = getSelectionSummary(departmentNames, dataset, noSurveys);
  const updatedOrganization = getSelectionSummary(
    departmentNames,
    dataset,
    eligibleSurveys,
  );
  const totalHeadcount = DEPARTMENT_PROFILES.reduce(
    (sum, item) => sum + item.size,
    0,
  );
  const expectedSatisfaction =
    (updatedMetrics.latest.factors.satisfaction * department.size +
      DEPARTMENT_PROFILES.slice(1).reduce(
        (sum, item) =>
          sum +
          getDepartmentMetrics(item.name, dataset, noSurveys).latest.factors
            .satisfaction *
            item.size,
        0,
      )) /
    totalHeadcount;

  assert.ok(
    Math.abs(
      updatedOrganization.latest.factors.satisfaction - expectedSatisfaction,
    ) < 1e-10,
  );
  assert.notEqual(
    updatedOrganization.latest.factors.satisfaction,
    originalOrganization.latest.factors.satisfaction,
  );
});

test('surveys from another seed do not change active department or dashboard metrics', () => {
  const activeSeed = (DEFAULT_SEED + 1) >>> 0;
  const dataset = generateSyntheticDataset(activeSeed, 'improving');
  const department = DEPARTMENT_PROFILES[0].name;
  const oldSeedSurveys = Array.from({ length: 10 }, () => ({
    department,
    month: MONTHS.at(-1)!,
    datasetSeed: DEFAULT_SEED,
    answers: {
      satisfaction: 1,
      commitment: 1,
      engagement: 1,
      workload: 1,
      career: 1,
    },
  }));

  assert.deepEqual(
    getDepartmentMetrics(department, dataset, oldSeedSurveys),
    getDepartmentMetrics(department, dataset, noSurveys),
  );
  const baselineSummary = getSelectionSummary(departmentNames, dataset, noSurveys);
  const oldSeedSummary = getSelectionSummary(departmentNames, dataset, oldSeedSurveys);
  assert.deepEqual(oldSeedSummary, baselineSummary);
  assert.deepEqual(
    oldSeedSummary.history.map((observation) =>
      getTrendLabel(observation.wsm ?? 0, observation.wma ?? 0),
    ),
    baselineSummary.history.map((observation) =>
      getTrendLabel(observation.wsm ?? 0, observation.wma ?? 0),
    ),
  );
  assert.equal(oldSeedSummary.forecastExits, baselineSummary.forecastExits);

  const activeSeedSurveys = oldSeedSurveys.map((survey) => ({
    ...survey,
    datasetSeed: activeSeed,
    answers: {
      satisfaction: 5,
      commitment: 5,
      engagement: 5,
      workload: 5,
      career: 5,
    },
  }));
  const activeMetrics = getDepartmentMetrics(department, dataset, activeSeedSurveys);
  assert.equal(activeMetrics.surveyCount, 10);
  assert.equal(activeMetrics.latest.factors.satisfaction, 100);
  assert.notEqual(
    activeMetrics.latest.factors.satisfaction,
    getDepartmentMetrics(department, dataset, noSurveys).latest.factors.satisfaction,
  );
});
