# Self-assessment — PA#2 Harness and quality gate

Submitted by:

- 23127078 — Quách Châu Hạo Kiệt (Person A: harness and gate)
- 23127116 — Nguyễn Quang Thái (Person B: contract and tests)

Total we claim: **91 / 100**

| #   | Criterion                                  | Max | We claim | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ------------------------------------------ | --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Rules file                                 | 15  | 14       | `CLAUDE.md`: Stack, Commands, Conventions, Never. The Never list is product-specific (no model key in client code, no real model call in unit tests, never edit a test / eval data / validator rule to pass a check, no names or emails to the model). Three Never lines are traced to real mistakes in `AI-LOG.md` ("Lint passed with a warning", "The secrets job did not scan the whole history", "Tests next to the code were silently skipped"), added in PR #1 and PR #3. |
| 2   | Permissions and secrets                    | 10  | 9        | Three tiers in `CLAUDE.md` §Permissions, enforced by `.claude/settings.json` (allow / ask / deny). `.env.example` lists all five variables with no values; `.env*` is git-ignored. The `secrets` CI job runs gitleaks 8.30.1 over every commit (`.github/workflows/ci.yml`), green on every run. README §Model and cost: the Gemini key's project is on the free tier with no billing account, so it cannot be charged.                                                         |
| 3   | One command for every check                | 10  | 9        | README §Checks and `CLAUDE.md` §Commands list `npm run lint`, `format:check`, `typecheck`, `test`; `package.json` defines them and `ci.yml` runs exactly those four. A fresh clone of `main` at `cbd0aa6` followed the README to green on Node 24 (`npm ci`, `npm run check`: 75/75 tests), recorded in `PA2.md` §Fresh clone.                                                                                                                                                  |
| 4   | CI that blocks a merge                     | 20  | 17       | `main` protection with the five checks required, strict, admins included: `docs/evidence/main-protection.json`. PR #4 blocked at `c96aef2` (red `test`): `docs/evidence/blocked-pr.json`, run 42659339125; turned green by `ef5a074`, run 42659621100. All changes since protection went through PRs. See `PA2.md` for links.                                                                                                                                                   |
| 5   | Contract of one AI Travel Planner endpoint | 25  | 23       | `docs/contract/save-plan.md` for `POST /api/v1/plans/{planId}/save`: role `member` + creator + current group member (§4), request/response shapes with field rules (§3, §4), 12 RFC 9457 problem types with status and title (§2), 10 validator refusal codes, idempotency and concurrency (§4), evaluation order, versioning policy (§5).                                                                                                                                      |
| 6   | Contract tests that bite                   | 15  | 14       | `tests/save-plan.contract.test.ts` (74 test cases): every problem `type`, title, status, headers and body; ownership (another member, outsider, admin, removed creator → 403); idempotency replay, key reuse, scoping, retention; rollback. Deliberate break `c96aef2` turned the required `test` job red (3 ownership failures); the test file blob is identical across `f177ffb`, `c96aef2`, `ef5a074` (`docs/evidence/contract-gate.md`).                                    |
| 7   | AI-LOG.md                                  | 5   | 5        | `AI-LOG.md`: tools per person and part; real Changed / Rejected entries, including the lint step that could not fail on warnings and the secrets job that did not scan the whole history (both found by making checks fail on purpose and by a fresh review).                                                                                                                                                                                                                   |
|     | **Total**                                  | 100 | **91**   |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

## What we did not manage

- **PRs were merged with "Rebase and merge".** The commits on `main` therefore have new hashes
  and the merge date, not the original ones. The evidence for criteria 4 and 6 points at the
  original, unrebased commits, which stay on branch `feat/save-plan-contract` and in PR #4
  (`c96aef2` break, `ef5a074` repair). We kept that branch and will use merge commits from now on.
- **Protection evidence is an API read-back, not a screenshot** of the settings page
  (`docs/evidence/main-protection.json`).
- **The spending cap is "no billing account"**, not a numeric cap set in a billing console. If
  billing is ever enabled, a budget must be set first.
- **The `secrets` job was never shown going red.** Forcing it would mean committing a key-shaped
  string, and we chose to keep the history free of anything that looks like a secret.
- **The endpoint runs on synthetic fixtures and a local SQLite store.** The class place dataset,
  accounts, draft editing and the LLM are PA#3 work.
- **The first deliberate break (`d30ca37`) ran before protection was enabled**, so we repeated
  it as `c96aef2` with protection active; only the second counts as the blocked-merge evidence.

## What we would do differently

Turn branch protection on the day CI first goes green, and pick "Create a merge commit" as the
only merge method in the repository settings, so the evidence history is never rewritten.
