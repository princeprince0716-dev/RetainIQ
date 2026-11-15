# RetainIQ

Healthcare employee retention improvement learning prototype.

**Live MVP:** https://retain-iq-platform.replit.app

This archive contains the current RetainIQ frontend, its shared workspace packages, and build configuration. The application source is in `artifacts/retainiq/src`.

The current main sections are Survey, Results, Action Plans, and Progress. The Testing & Peer Feedback tab has been removed. Older source modules are retained rather than deleted.

## Run locally

Use Node.js 22.18 or newer and pnpm 10. The supplied dependency configuration targets Linux x64; on Windows use WSL2, or use a Linux development environment.

From the extracted `RetainIQ` directory:

```sh
pnpm install --no-frozen-lockfile
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/retainiq run dev
```

Open http://localhost:5173.

## Build and check

```sh
pnpm --filter @workspace/retainiq run typecheck
pnpm --filter @workspace/retainiq test
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/retainiq run build
```

The built frontend is written to `artifacts/retainiq/dist/public`.

## Data and privacy

The current prototype uses browser localStorage. This source archive does not contain saved survey responses, action plans, testing records, peer reviews, credentials, or environment secrets. Existing records in the original browser remain unchanged; they will not automatically appear when this app runs at a new address.

Example data is synthetic demonstration data, not evidence of real-world predictive accuracy. Small-group safeguards and existing calculations remain in the source.

The older README inside the app directory describes a previous version. This top-level file describes the current navigation and setup.
