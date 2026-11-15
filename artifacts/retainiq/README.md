# RetainIQ

RetainIQ is a frontend-only, graduate-level Industrial-Organizational Psychology course demonstration for exploring department-level workforce conditions and simulated voluntary turnover trends in a fictional healthcare organization.

## Features

- Reproducible synthetic organization of exactly 520 fictional employees across eight departments, with synthetic IDs, fixed department denominators, 12 months of historical scores and turnover.
- Stable, improving, and deteriorating scenarios, with a new randomized seed for each generated dataset and a fixed-seed Reset Demo.
- Department baselines, gradual monthly variation, and improving, declining, stable, and accelerating trend profiles.
- WSM and WMA are recalculated from the weighted monthly factor scores, never generated as independent random values.
- Documented seeded voluntary-exit simulation whose invented assumptions do not represent real-world turnover patterns.
- Overview of workforce size, historical turnover, simulated six-month turnover, current weighted conditions, and links to the four product destinations.
- Interactive department comparison for historical and simulated turnover rates.
- Combined proposed Workforce Satisfaction/Momentum (WSM) and Workforce Momentum Acceleration (WMA) analysis using five weighted workplace factors.
- Voluntary five-item Likert survey with 0–100 conversions, department/month aggregation, and suppression below 10 submissions.
- Rule-based department-level retention suggestions with visible triggers and human-review caveats.
- Testing & Feedback page with the three requested tester tasks, two blank peer-review forms, local persistence, and CSV export.
- Methodology & Privacy documentation with a confirmed reset of locally stored demo records.

## User flow

1. Start at **Overview** to inspect synthetic organization-level conditions.
2. Open **Turnover Prediction** to compare departments and inspect the historical/simulated boundary.
3. Open **Workforce Momentum** to understand weighted scores, WSM, and WMA.
4. Optionally submit a fictional response in **Employee Survey**. Aggregates remain suppressed until a department/month has 10 submissions; eligible latest-month aggregates flow through to the momentum calculations.
5. Review transparent, non-prescriptive **Retention Recommendations**.
6. Use **Testing & Feedback** to record actual usability observations and export them. Forms begin blank; no results are fabricated.
7. Select a scenario, then choose **Generate New Dataset** to update the Overview, Turnover Prediction, Workforce Momentum, and Retention Recommendations pages together.
8. Choose **Reset Demo** to restore the original stable dataset and fixed seed. Survey submissions, usability results, and peer reviews remain saved; only survey entries tagged to the active seed affect the current aggregate.
9. Review **Methodology & Privacy** for the data-generation and turnover-simulation rules.

## Setup

From the repository workspace, run:

```sh
cd artifacts/retainiq
pnpm install
pnpm dev
```

The project uses the existing React/Vite scaffold and dependencies. Survey submissions, tester entries, peer reviews, and the active scenario/seed are saved only in this browser's `localStorage`; no API, database, or external service is used. Generating or resetting a dataset does not change saved survey, testing, or peer-review records. Survey entries from another seed are retained but excluded from the active scenario's aggregates.

## Limitations

All employees, scores, turnover counts, forecasts, and organization details are synthetic. The seeded generator combines department baselines, gradual scenario and department trend changes, and bounded correlated random variation. For each fictional employee and month, voluntary-exit probability is `clamp(0.004 + max(0, 68 - weightedScore) * 0.00045 + max(0, 58 - workloadManageability) * 0.0002, 0.002, 0.025)`. A separate seeded draw selects at most one hypothetical exit month per employee. This invented formula does not represent real-world healthcare turnover patterns. Forecasts are simulated rules—not trained, validated, calibrated, or fit for operational decisions. WSM/WMA are calculated from the factor scores and are proposed and unvalidated. Small-group suppression is a teaching safeguard, not an anonymity guarantee. Voluntary participation, missingness, representativeness, fairness, validity, and contextual human oversight must be considered; this prototype must not be used to rank or make decisions about individuals.
