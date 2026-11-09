# Wandora

AI Travel Planner: a day-by-day schedule and spending plan for a group visiting Ho Chi Minh City.
CSC13114 Advanced Web Application Development, class 23KTPM1.

## Setup

Requires Node 24 and npm.

```bash
npm ci
cp .env.example .env
npm run dev
```

Fill in `.env` locally. It is git-ignored and must never be committed.

## Checks

Each check is one command. CI runs exactly these.

| Check    | Command                |
| -------- | ---------------------- |
| Lint     | `npm run lint`         |
| Format   | `npm run format:check` |
| Types    | `npm run typecheck`    |
| Tests    | `npm test`             |
| All four | `npm run check`        |

`npm run format` fixes formatting. CI also runs gitleaks over the whole git history.

## Model and cost

- **Provider:** Google Gemini, through a Google AI Studio API key, called from server code only.
- **Spending cap:** the key's Google Cloud project is on the free tier with **no billing account**,
  so the key cannot be charged. If billing is ever turned on, a budget with alerts is set first
  and this section is updated.
- **Model and cost per plan:** chosen and measured in PA#3.

## Contributing

Work on a branch and open a pull request into `main`. CI must be green to merge.
Rules for the coding assistant are in [`CLAUDE.md`](CLAUDE.md).

## PA#2 save-plan endpoint (Person B)

- Contract: [`docs/contract/save-plan.md`](docs/contract/save-plan.md).
- Route: `POST /api/v1/plans/{planId}/save`.
- Tests: `tests/save-plan.contract.test.ts`, included in the existing `npm test`
  command and the CI `test` job. No API keys, network access or model calls are
  needed to run these tests; they use isolated SQLite databases and synthetic data.
- Backend modules: `src/server/plans/`. Save rechecks ownership and the final
  validator, calculates VND costs in code, then atomically stores the shared
  snapshot and idempotent receipt. Retries survive database reopen.
- Runtime: Node 24, a writable SQLite file (default `.data/plans.sqlite`), and a
  backend-only `AUTH_SESSION_SECRET` of at least 32 random bytes. `.env.example`
  lists the two new variables without values. The test signing key is generated
  in memory and never saved. No key is committed or exposed to the browser.
- Accounts and draft/group editing are outside this checkpoint. A new database
  is empty; the route does not create a plan or issue sessions. The internal
  `PlanStore.putPlan` adapter and `signSession` provisioning helper are ready for
  those integrations. Missing credentials are refused; there is no demo login
  bypass. See [`docs/person-b-handoff.md`](docs/person-b-handoff.md).

The PA#2 model cost is **0 VND per save**: this endpoint makes no model calls.
This does not estimate the PA#3 generation cost.
