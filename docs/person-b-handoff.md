# Person B handoff - PA#2

Team: **23127078, 23127116** (ascending order). Person B owns criteria 5 and 6
and logs their own assistant use. Person A owns the harness and branch protection.
Keep the existing npm commands, workflow and `CLAUDE.md` rules.

## Delivered interface

Contract: [`contract/save-plan.md`](contract/save-plan.md).
Route: `POST /api/v1/plans/{planId}/save`. The body contains
`expectedVersion` and `confirmed: true`; the user must press Save after reviewing
the schedule. The request cannot supply a replacement plan or trusted total.

`PlanStore.putPlan({plan, data})` is the internal integration point for draft and
group data. `src/server/plans/types.ts` defines the stored shape. A draft must
already have completed the first confirmation (`candidateConfirmed: true`).
Changing a draft must increment its version; publishing is exclusively through
the save transaction. Group views must read the immutable `snapshots` table,
not a draft, and must apply their own membership checks when implemented.

Stored prices, hours, travel times and hourly weather are the final validator's
inputs. Refresh the stored checked-data snapshot through an internal adapter
before saving when upstream data changes. Do not accept these facts from a
browser/model without the checked-data boundary. The fixture in `tests/fixtures/`
is synthetic and is never seeded automatically into the runtime database.

## Session adapter

The checkpoint session is `<base64url(JSON payload)>.<base64url(HMAC-SHA256)>`.
Payload: `{userId, role, exp}`; `exp` is an integer Unix second. `signSession` is
backend/test provisioning only. Verification checks signature, expiry and claim
shape. Signing secret: backend-only `AUTH_SESSION_SECRET`, at least 32 random
bytes, generated locally and never pasted into a chat or committed. There is no
default secret and no public session-creation endpoint. The account integration
can replace this adapter later while preserving the route's identity/ownership
contract. Tests exercise genuine signatures, not a trusted identity header.

## Storage boundary

The SQLite adapter uses `node:sqlite`, bundled with Node 24; it introduces no npm
dependency. Set optional `PLAN_STORE_PATH` to a persistent file or keep the default
`.data/plans.sqlite`. The directory is git-ignored. Snapshots, version updates and
successful receipts commit together. No receipt expiration is currently needed:
retention is indefinite, satisfying the contract's minimum 24 hours.

This checkpoint targets a single-process Node deployment with persistent local
disk. Serverless ephemeral disk or multiple app instances require a shared
transactional adapter (such as the planned Postgres integration), not separate
SQLite copies. `DATABASE_URL` remains reserved for that work.

## Checks and gate evidence

Run exactly `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`,
or the aggregate `npm run check`. Tests include refusal state, all error envelopes,
ownership, replay after 24 hours/database reopen, competing requests, and a forced
database failure proving atomic rollback. No workflow change is needed for test
discovery: A's Vitest include already covers the new tests.

For the deliberate break, remove only the creator comparison from `maySave` in
`src/server/plans/save.ts` on the feature branch. This lets another group member
save the creator's draft, contradicting the contract. The ownership test must
fail in GitHub Actions. Restore the comparison in a later commit, without changing
tests, and retain the failing run, repair commit and passing run in `PA2.md`.
Never merge the broken revision. Do not rebase, force-push or rebuild this history.

## Shared submission tasks still owned together

- Require `lint`, `format`, `typecheck`, `test`, `secrets` on protected `main`;
  require PRs and apply the rule to administrators. Preserve a settings screenshot.
- Link actual evidence in `PA2.md`. Do not claim required checks from a green CI
  run alone: branch protection must also be enabled.
- Complete `SELF_ASSESSMENT_REPORT.md` together after the evidence exists. Do not
  assign Person A's marks from Person B's work alone.
- After review/merge, tag the final submitted commit `pa2`, push the tag and link
  its CI run. Do not tag this intermediate feature branch as the final submission.
- Zip the repository including `.git` as `23127078-23127116_<total>.zip`, where
  `<total>` is the agreed self-assessed total. One member submits from their
  student email by **26 November 2026, 22:00 (Asia/Ho_Chi_Minh)**.
