# PA#2 - Wandora

Team: **23127078, 23127116**. All submission documents are in English.

Repository: [nqthai37/Wandora](https://github.com/nqthai37/Wandora) (public).
This file records evidence as work happens; it is not a claim that the final
team submission has already been tagged or graded.

## Person B - contract and tests

- Endpoint: `POST /api/v1/plans/{planId}/save`.
- [Contract](docs/contract/save-plan.md), [test matrix](docs/contract/save-plan-test-matrix.md),
  [contract tests](tests/save-plan.contract.test.ts), [integration handoff](docs/person-b-handoff.md).
- Local validation: the four existing commands (`npm run lint`,
  `npm run format:check`, `npm run typecheck`, `npm test`) pass on Node 24.22.1;
  75 total tests, including A's health test. `npm run build` also passes.
- The production HTTP route was exercised with an isolated temporary database:
  401 for no session, 403 for another group member, 200 for a valid save and an
  identical 200 replay. Calculated total: 100000 VND from synthetic fixtures.
- Deliberate contract-break evidence will be linked here after the real PR CI run.
  Tests will stay unchanged between the break and the repair.

## Person A - harness evidence already recorded

- [Rules](CLAUDE.md), [permissions](.claude/settings.json),
  [workflow](.github/workflows/ci.yml), [commands](README.md#checks), [AI log](AI-LOG.md).
- [A's deliberate harness failure PR #2](https://github.com/nqthai37/Wandora/pull/2),
  closed without merging, targets `chore/harness`.
- [A's failing CI run](https://github.com/nqthai37/Wandora/actions/runs/42612115976)
  is recorded in A's AI log. It demonstrates failing checks; by itself it does
  **not** prove that a protected `main` blocked a merge.

## Shared evidence still to complete

| Requirement                            | Status / evidence                                                                                                                                                                                                                            |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public repository                      | Verified through GitHub repository metadata.                                                                                                                                                                                                 |
| Protected `main` with required checks  | [Settings](https://github.com/nqthai37/Wandora/settings/branches). At the initial inspection on 9 November, the API reported `protected: false` and no required checks. Enable and attach a screenshot; do not claim it from a green CI run. |
| A PR blocked by a required red check   | Pending verification after protection is enabled.                                                                                                                                                                                            |
| Commit that turns the blocked PR green | Pending the break/repair sequence.                                                                                                                                                                                                           |
| Deliberate contract break caught by CI | Pending actual CI evidence; see Person B above.                                                                                                                                                                                              |
| CI for submitted `pa2` tag             | Not created: tag the final reviewed/merged team submission, not this intermediate branch.                                                                                                                                                    |
| Self-assessment and final ZIP          | Complete jointly; filename `23127078-23127116_<total>.zip`, including `.git`, `PA2.md`, `AI-LOG.md`, `SELF_ASSESSMENT_REPORT.md`.                                                                                                            |

No final total is claimed yet. Submit by **26 November 2026, 22:00,
Asia/Ho_Chi_Minh**, from one member's student email account.
