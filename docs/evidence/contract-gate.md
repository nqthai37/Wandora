# Observed contract gate - PR #4

Repository: [nqthai37/Wandora](https://github.com/nqthai37/Wandora).
PR: [#4](https://github.com/nqthai37/Wandora/pull/4), base `main`.

## Real break, real required check

1. Baseline `f177ffbb894831878d7ffb6783c6508e8b20a49a` passed
   [CI run 42658220503](https://github.com/nqthai37/Wandora/actions/runs/42658220503).
2. With main protection already active, deliberate break `c96aef24b48d75f2ff0e90353befa1b39010ba6f` deleted exactly one
   line from `src/server/plans/save.ts`: `actor.userId === plan.creatorId &&`.
   Tests, fixtures and contract were unchanged.
3. [Run 42659339125](https://github.com/nqthai37/Wandora/actions/runs/42659339125)
   failed only the `test` job. The real
   [job log](https://github.com/nqthai37/Wandora/actions/runs/42659339125/job/129306342391)
   reports 3 failures and 72 passes:
   - Another group member got 200 instead of the specified 403.
   - Ownership-before-body precedence returned 400 instead of 403.
   - Ownership recheck after reading the body returned 200 instead of 403.
4. Main protection was enabled, then independently read back through the REST
   API. The [saved response](main-protection.json) shows required `test` plus
   `lint`, `format`, `typecheck`, `secrets`, strict/up-to-date checking, one
   approval and enforcement for administrators. Checks are tied to the GitHub
   Actions app (15368); there is no administrator bypass.
5. **Before pushing the repair**, `GET /repos/nqthai37/Wandora/pulls/4` returned
   this relevant subset (observed API response, not a screenshot):

   ```json
   {
     "number": 4,
     "state": "open",
     "mergeable": true,
     "mergeable_state": "blocked",
     "head": {
       "ref": "feat/save-plan-contract",
       "sha": "c96aef24b48d75f2ff0e90353befa1b39010ba6f"
     }
   }
   ```

   `mergeable: true` means no Git conflict; it does not authorize merging.
   `test` was required and failed, so merging was prohibited. The separate
   one-approval requirement was also unmet. No merge was attempted or bypassed.

6. Repair `ef5a0741d5a54cd2bbf0c0e1f5f0ed6d2b940275` restores the same condition,
   changing only the implementation. See
   [repair run 42659621100](https://github.com/nqthai37/Wandora/actions/runs/42659621100).

## Tests were not weakened

The Git blob ID of `tests/save-plan.contract.test.ts` is identical in the baseline,
break and repair commits:

```text
f177ffb -> 9bd75079e7d624b322d1f2a93db1cf5dd2237d53
c96aef2 -> 9bd75079e7d624b322d1f2a93db1cf5dd2237d53
ef5a074 -> 9bd75079e7d624b322d1f2a93db1cf5dd2237d53
```

Verify with `git rev-parse <commit>:tests/save-plan.contract.test.ts`.
The break and repair each modify one implementation line only. History is
preserved; no rebase, force push or direct push to `main` was used.

The main protection rule was enabled and read back before the final deliberate
break commit c96aef2 was pushed. Its test check failed while already required.
The actual blocked-state API response is preserved in
[blocked-pr.json](blocked-pr.json).
