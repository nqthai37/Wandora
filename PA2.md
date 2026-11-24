# PA#2 — Wandora (AI Travel Planner): harness and quality gate

Team: 23127078 Quách Châu Hạo Kiệt (Person A, harness and gate) · 23127116 Nguyễn Quang Thái
(Person B, contract and tests). Self-assessment: [`SELF_ASSESSMENT_REPORT.md`](SELF_ASSESSMENT_REPORT.md).

## Required links

| What                        | Link                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository (public)         | https://github.com/nqthai37/Wandora                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Protected-branch settings   | [Settings → Branches](https://github.com/nqthai37/Wandora/settings/branches) (owner-only page); read-back of the rule through the REST API: [`docs/evidence/main-protection.json`](docs/evidence/main-protection.json)                                                                                                                                                                                                                              |
| PR blocked by a red check   | [PR #4](https://github.com/nqthai37/Wandora/pull/4) at head [`c96aef2`](https://github.com/nqthai37/Wandora/commit/c96aef24b48d75f2ff0e90353befa1b39010ba6f): required `test` failed in [run 42659339125](https://github.com/nqthai37/Wandora/actions/runs/42659339125); GitHub reported `mergeable_state: blocked` ([`docs/evidence/blocked-pr.json`](docs/evidence/blocked-pr.json))                                                              |
| Commit that turned it green | [`ef5a074`](https://github.com/nqthai37/Wandora/commit/ef5a0741d5a54cd2bbf0c0e1f5f0ed6d2b940275), [run 42659621100](https://github.com/nqthai37/Wandora/actions/runs/42659621100): all five required jobs green                                                                                                                                                                                                                                     |
| CI run for the `pa2` tag    | [Actions runs for `pa2`](https://github.com/nqthai37/Wandora/actions?query=branch%3Apa2) (the workflow runs on every tag push)                                                                                                                                                                                                                                                                                                                      |
| Deliberate contract break   | [`c96aef2`](https://github.com/nqthai37/Wandora/commit/c96aef24b48d75f2ff0e90353befa1b39010ba6f) deletes one implementation line (`actor.userId === plan.creatorId &&`), so another group member could save the creator's draft. [Failed test job](https://github.com/nqthai37/Wandora/actions/runs/42659339125/job/129306342391): 3 ownership tests failed, 72 passed. Details: [`docs/evidence/contract-gate.md`](docs/evidence/contract-gate.md) |

**About commit hashes.** PR #4 was merged with "Rebase and merge", so `main` holds re-created
copies of its commits (for example `39b68d0` and `4c1fca8`) with the merge date. The evidence above
uses the **original** commits and CI runs, which stay on branch
[`feat/save-plan-contract`](https://github.com/nqthai37/Wandora/tree/feat/save-plan-contract) and
in PR #4. That branch is kept on purpose. The file tree of `main` after the merge is identical to
the PR head `3f2c67e`.

## Person A — harness

- Rules: [`CLAUDE.md`](CLAUDE.md) (Stack, Commands, Conventions, Never, Permissions).
- Permissions in three tiers, enforced: [`.claude/settings.json`](.claude/settings.json).
- Secrets: [`.env.example`](.env.example) lists every variable without values; `.env*` is
  git-ignored; the `secrets` job scans every commit with gitleaks. Spending cap: README
  [§Model and cost](README.md#model-and-cost).
- One command per check: README [§Checks](README.md#checks), the same four commands in
  [`ci.yml`](.github/workflows/ci.yml).
- Each check proven able to fail: [PR #2](https://github.com/nqthai37/Wandora/pull/2), closed
  without merging; [run 42612115976](https://github.com/nqthai37/Wandora/actions/runs/42612115976)
  shows `lint`, `format`, `typecheck` and `test` red for the planted reasons.
- Harness merged through [PR #1](https://github.com/nqthai37/Wandora/pull/1) (green
  [run 42644730048](https://github.com/nqthai37/Wandora/actions/runs/42644730048)) and
  [PR #3](https://github.com/nqthai37/Wandora/pull/3).

### Fresh clone

On 24 November 2026 a fresh `git clone` of `main` at `cbd0aa6`, following the README on Node 24
(`npm ci`, `cp .env.example .env`, `npm run check`), passed lint, format, typecheck and tests
(2 files, 75 tests).

## Person B — contract and tests

- Endpoint: `POST /api/v1/plans/{planId}/save`.
- [Contract](docs/contract/save-plan.md), [test matrix](docs/contract/save-plan-test-matrix.md),
  [contract tests](tests/save-plan.contract.test.ts), [integration handoff](docs/person-b-handoff.md).
- Baseline green: [run 42658220503](https://github.com/nqthai37/Wandora/actions/runs/42658220503)
  at `f177ffb`.
- The test file is byte-identical in the baseline, break and repair commits (blob
  `9bd75079e7d624b322d1f2a93db1cf5dd2237d53`); the break and the repair each change one
  implementation line. See [`docs/evidence/contract-gate.md`](docs/evidence/contract-gate.md).

## Branch protection

Enabled on `main` on 9 November 2026 at 16:49 UTC, before the deliberate break `c96aef2` was
pushed: pull request with one approval, the five checks `lint`, `format`, `typecheck`, `test`,
`secrets` required and up to date, conversations resolved, administrators included, force push
and deletion disabled. Every change to `main` after that went through a pull request.
