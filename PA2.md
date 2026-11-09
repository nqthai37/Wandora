# PA#2 - Wandora

Team: **23127078, 23127116**. All submission documents are in English.

Repository: [nqthai37/Wandora](https://github.com/nqthai37/Wandora) (public).
This evidence record does not claim that the final team submission is already
reviewed, tagged or graded.

## Person B - contract and tests

- Endpoint: POST /api/v1/plans/{planId}/save.
- [Contract](docs/contract/save-plan.md), [test matrix](docs/contract/save-plan-test-matrix.md),
  [contract tests](tests/save-plan.contract.test.ts), [integration handoff](docs/person-b-handoff.md).
- Local validation: npm run lint, npm run format:check, npm run typecheck and
  npm test pass on Node 24.22.1. **75 tests** including A's health test.
  The production build also passes.
- Production HTTP smoke with an isolated database: 401 with no session, 403 for
  another group member, 200 for a valid save and identical 200 replay. Calculated
  total: 100000 VND from synthetic fixtures. No model call.
- [PR #4](https://github.com/nqthai37/Wandora/pull/4) targets main.
- [Initial green run](https://github.com/nqthai37/Wandora/actions/runs/42658220503)
  checks baseline f177ffb.
- [Deliberate break commit](https://github.com/nqthai37/Wandora/commit/c96aef24b48d75f2ff0e90353befa1b39010ba6f)
  removes only the creator comparison. Another group member can incorrectly save
  the draft. [Red run](https://github.com/nqthai37/Wandora/actions/runs/42659339125),
  [failed test job](https://github.com/nqthai37/Wandora/actions/runs/42659339125/job/129306342391):
  **3 ownership tests failed, 72 passed**. Lint, format, typecheck and secrets passed.
- [Repair commit](https://github.com/nqthai37/Wandora/commit/ef5a0741d5a54cd2bbf0c0e1f5f0ed6d2b940275)
  restores the creator comparison. [Repair CI run](https://github.com/nqthai37/Wandora/actions/runs/42659621100).
  Tests, fixtures and contract were unchanged through the break and repair.
- [Gate observation and unchanged-test proof](docs/evidence/contract-gate.md).

## Person A - harness evidence already recorded

- [Rules](CLAUDE.md), [permissions](.claude/settings.json),
  [workflow](.github/workflows/ci.yml), [commands](README.md#checks), [AI log](AI-LOG.md).
- [A's harness failure PR #2](https://github.com/nqthai37/Wandora/pull/2), closed
  without merging, targets chore/harness.
- [A's failing run](https://github.com/nqthai37/Wandora/actions/runs/42612115976)
  demonstrates failing checks. The main-branch gate evidence is PR #4 below.

## Branch protection and submission status

| Requirement                            | Status / evidence                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public repository                      | Verified through GitHub repository metadata.                                                                                                                                                                                                                                                                                                                      |
| Protected main                         | [Settings](https://github.com/nqthai37/Wandora/settings/branches), [read-back API evidence](docs/evidence/main-protection.json). PR plus one approval required; stale reviews dismissed; all five checks required and tied to GitHub Actions; up-to-date branches and resolved conversations required; administrators included; force push and deletion disabled. |
| PR stopped by a required red check     | [PR #4](https://github.com/nqthai37/Wandora/pull/4). Before repair, its head was c96aef2 and the API reported mergeable_state: blocked. The required test job failed; review approval was also unmet.                                                                                                                                                             |
| Commit turning checks green            | [ef5a074](https://github.com/nqthai37/Wandora/commit/ef5a0741d5a54cd2bbf0c0e1f5f0ed6d2b940275), repair run linked above. An independent team member's approval is still needed before merge.                                                                                                                                                                      |
| Deliberate contract break caught by CI | [c96aef2](https://github.com/nqthai37/Wandora/commit/c96aef24b48d75f2ff0e90353befa1b39010ba6f), [failed job](https://github.com/nqthai37/Wandora/actions/runs/42659339125/job/129306342391).                                                                                                                                                                      |
| CI for submitted pa2 tag               | Pending: tag the final reviewed/merged team submission, not this intermediate branch, then add the tag run URL.                                                                                                                                                                                                                                                   |
| Self-assessment and final ZIP          | Complete together; filename 23127078-23127116_<total>.zip, including .git, PA2.md, AI-LOG.md and SELF_ASSESSMENT_REPORT.md.                                                                                                                                                                                                                                       |

No final total is claimed yet. Submit by **26 November 2026, 22:00,
Asia/Ho_Chi_Minh**, from one member's student email account.

No commit has been pushed directly to main since protection was enabled.
Person B's work and evidence commits remain on the PR branch for review.

The main protection rule was enabled and read back before the final deliberate
break commit c96aef2 was pushed. Its test check failed while already required.
The actual blocked-state API response is preserved in
[blocked-pr.json](docs/evidence/blocked-pr.json).
