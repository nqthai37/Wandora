# Save-plan contract test matrix

Contract: [save-plan.md](save-plan.md). Run with the existing `npm test` command;
the required `test` CI job runs the same command. These are behavioral tests of
the route and persisted state, not just status-code assertions.

| Area            | Required evidence                                                                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Success         | Shape, content type, no-store, calculated integer VND, version increment, immutable saved snapshot, exactly one publication.                                                                             |
| Authentication  | Missing, forged, expired session; spoofed body/header identity ignored; 401 challenge; unset secret fails closed.                                                                                        |
| Ownership       | Different member of same group, outsider, non-member creator and admin denied; membership checked again before replay.                                                                                   |
| Errors          | Every problem type in the contract: exact URI, title, HTTP/body status, safe detail, instance; structured field errors.                                                                                  |
| Input           | Path ID, JSON media type, key bounds, malformed/empty JSON, 16 KiB body limit including streamed bodies, all invalid known fields.                                                                       |
| Idempotency     | Identical retry, reordered JSON, ignored unknown fields, changed fingerprint, key scoped by caller/plan, retry after refusal, persistent receipt after reopen.                                           |
| Concurrency     | Same key gives one save and replay; different keys for same version give one success and 409; failed persistence leaves no publication or receipt.                                                       |
| Final validator | Schema before business rules; unknown place/item; missing checked data; hours; starting gap and inter-stop travel; personal and lowest-group cap; group total; rain >60%; missing/out-of-range forecast. |
| Money           | Client/model totals ignored, catalog prices used; each member summed independently; exact cap accepted; unsafe arithmetic rejected.                                                                      |
| Gate proof      | Implementation-only deliberate ownership break makes the existing test job red; repair code in a later commit without editing tests; preserve both run URLs.                                             |

The gate proof must be an actual GitHub Actions run. A local failure or a planned
break is not sufficient evidence. Link the real PR, failing run, repair commit
and passing run in root `PA2.md` once available.
