# Save a plan - API contract, version 1

Wandora / AI Travel Planner / PA#2 / Person B / 9 November 2026.
This is the specification. When code disagrees with it, fix the code. Change this
contract explicitly before changing observable behavior; do not weaken tests to
make an implementation pass. Sections follow the IA#3 `CONTRACT.md` structure.

## 1. Conventions

- Endpoint: `POST /api/v1/plans/{planId}/save`, relative to the deployment origin.
- HTTPS in deployment; JSON in UTF-8. Success is `application/json`; errors are
  `application/problem+json`. Responses carry `Cache-Control: no-store`.
- `planId` is an ASCII identifier matching `[A-Za-z0-9_-]{1,64}`.
- Money is integer VND, computed from checked server-side item prices, never from
  model estimates or a client-supplied total. Times in stored schedules use
  `YYYY-MM-DDTHH:mm:00+07:00` (Ho Chi Minh City); `savedAt` is UTC ISO 8601.
- Unknown request fields are ignored (including client-supplied costs, schedules,
  ownership and validation results). Clients ignore unknown response fields.
- No paging: this endpoint saves one existing draft, not a list.
- Saving is the **second user confirmation**, after candidate selection. A failed
  save never publishes a schedule. This endpoint never calls a model.

## 2. Errors

Every error from this endpoint uses [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457):

```json
{
  "type": "https://github.com/nqthai37/Wandora/blob/main/docs/contract/save-plan.md#plan-invalid",
  "title": "Plan rejected",
  "status": 422,
  "detail": "The plan must pass backend validation before sharing.",
  "instance": "/api/v1/plans/plan-1/save",
  "errors": [
    {
      "pointer": "/stops/0",
      "code": "closed",
      "detail": "The stop is outside checked opening hours."
    }
  ]
}
```

`type` is the URL above with the table's slug as its fragment. `title` and HTTP
`status` equal the table. `detail` is nonempty, safe English; it never contains
stack traces, keys, paths or database messages. `instance` is the request pathname,
without its query string. Clients branch on `type`, not human-readable text.
Only `validation` and `plan-invalid` include `errors`: a nonempty array of
`{pointer, code, detail}` with a JSON Pointer into the request or stored plan.

| Slug                      | HTTP status | Title                    | Meaning                                                                                                                                                   |
| ------------------------- | ----------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unauthenticated`         | 401         | Authentication required  | Missing, malformed, invalid or expired bearer session. Also includes `WWW-Authenticate: Bearer`.                                                          |
| `not-found`               | 404         | Plan not found           | Invalid identifier or no plan.                                                                                                                            |
| `forbidden`               | 403         | Save forbidden           | Caller is not a `member`, not the plan creator, or no longer a member of its group. Administrators have no ownership bypass.                              |
| `unsupported-media-type`  | 415         | JSON required            | Content-Type is not `application/json` (optional charset is accepted).                                                                                    |
| `idempotency-key-missing` | 400         | Idempotency-Key required | Missing key or a key outside `[A-Za-z0-9_-]{1,128}`.                                                                                                      |
| `payload-too-large`       | 413         | Request too large        | Encoded request body exceeds 16,384 bytes.                                                                                                                |
| `invalid-json`            | 400         | Malformed JSON           | Empty or unparseable JSON body.                                                                                                                           |
| `validation`              | 400         | Invalid request          | Body is not an object, `expectedVersion` is not a positive safe integer, or `confirmed` is not the boolean `true`. All invalid known fields are reported. |
| `idempotency-key-reused`  | 422         | Idempotency-Key reused   | Same caller/plan/key, different accepted request fields.                                                                                                  |
| `version-conflict`        | 409         | Plan version changed     | Expected version differs from stored version, or that version was already saved under another key. Refetch and review before saving again.                |
| `plan-invalid`            | 422         | Plan rejected            | Final backend schema or business validation fails.                                                                                                        |
| `internal`                | 500         | Internal error           | Unexpected failure or unavailable storage/session configuration. Detail is always `The request could not be completed.`                                   |

### Validator refusal codes

`plan-invalid.errors` uses these codes. Pointers reference the **stored draft**,
not the save body. Errors report all independent violations that can be checked;
malformed draft shape returns `schema` before business validation.

| Code                  | Refusal                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema`              | Invalid draft shape, invalid dates/times/order, duplicate members, missing caps, invalid item quantities or unsafe money arithmetic.                          |
| `unknown-place`       | Stop's place is absent from the checked catalog.                                                                                                              |
| `unknown-item`        | Chosen item does not belong to that checked place.                                                                                                            |
| `unchecked-place`     | Place lacks checked opening hours or menu.                                                                                                                    |
| `closed`              | Entire stop does not fit one opening interval for its local weekday.                                                                                          |
| `travel-time`         | Missing motorbike matrix entry or gap too short (including starting point to first stop).                                                                     |
| `personal-cap`        | A member's summed spending exceeds their own cap **or the group's lowest cap**.                                                                               |
| `group-budget`        | Sum across all members exceeds the group total.                                                                                                               |
| `rain`                | Any hourly slot intersecting an outdoor stop has rain probability greater than 60%. Exactly 60% is accepted.                                                  |
| `weather-unavailable` | A stop is outside the fixture's seven-day forecast or an outdoor stop lacks an hourly forecast. Saving fails closed rather than treating missing data as dry. |

## 3. Resources

The save body references an existing, server-held draft. Draft creation/editing
and candidate confirmation are outside this checkpoint's one-endpoint scope.
The storage adapter holds the creator ID, current group members and their caps,
group budget, checked catalog, forecast, motorbike matrix, draft version and
ordered stops. The server validates this data again at save time, including when
the draft was edited manually. Each member's ticket/menu selection is counted
using the catalog price times quantity. Transport estimates and lodging are not
included (as in the class brief); no bills are split and no booking occurs.

Successful `200` response:

```json
{
  "planId": "plan-1",
  "groupId": "group-1",
  "version": 2,
  "state": "saved",
  "sharedWithGroup": true,
  "savedAt": "2026-11-09T08:00:00.000Z",
  "cost": {
    "currency": "VND",
    "totalVnd": 100000,
    "members": [
      { "userId": "user-1", "totalVnd": 50000 },
      { "userId": "user-2", "totalVnd": 50000 }
    ]
  }
}
```

`version` is the saved draft version plus one, a positive safe integer. `state`,
`sharedWithGroup`, and `currency` have the exact values shown. Cost members stay
in stored group order, once per current member including zero spending. Every
amount is a nonnegative safe integer; `totalVnd` is their sum. `savedAt` is the
time of the successful original save. The stored saved snapshot contains the
validated stops and calculated costs; subsequent draft edits cannot alter it.
No names, emails, session tokens or model keys appear in the response.

## 4. Endpoint

### Authentication and ownership

Send `Authorization: Bearer <session>`. The backend verifies the session signature
and expiry. Caller must have role `member`, be this draft's `creatorId`, **and**
be a current member of its group. Another member of the same group receives
`403 forbidden` for someone else's draft. A caller from another group also
receives `403` for an existing draft. Invalid sessions receive `401` first.
An authenticated caller gets `404` for a nonexistent plan. Role or ownership
claims in JSON or `X-User-Id` headers are never trusted.

### Request

```http
POST /api/v1/plans/plan-1/save
Authorization: Bearer <session>
Content-Type: application/json
Idempotency-Key: save-plan-1-attempt-1

{"expectedVersion":1,"confirmed":true}
```

`expectedVersion`: positive safe integer, must match the current draft version.
`confirmed`: literal boolean `true`; the client sends it only after the user
reviews the schedule and spending and presses Save. This endpoint does not
accept a replacement schedule. Edit the draft first, refetch its new version,
and ask the user to review it before saving again.

### Evaluation order

The first failing step determines the error:

1. Verify bearer session.
2. Validate path ID, load the draft (404), then enforce role and ownership (403).
3. Check JSON media type, then idempotency key.
4. Read at most 16,384 bytes; parse JSON; check save-body fields.
5. Look up caller/plan/key: replay a successful response or reject key reuse.
   Recheck access **before** replay so a removed member cannot recover group data.
6. In one storage transaction, reread the current draft and access, check version,
   validate the draft schema, compute costs and run the final backend validator.
7. Atomically save the immutable snapshot, increment version, mark it shared and
   record the idempotent response. Return `200`; no partial publication is allowed.

### Idempotency and concurrency

- Scope is `(authenticated userId, planId, Idempotency-Key)`.
- Fingerprint consists of accepted fields `expectedVersion` and `confirmed`.
  JSON whitespace, field order and unknown fields do not affect it.
- Same scope and fingerprint replays the original `200` and identical body,
  including `savedAt`, `version` and cost, with `Idempotent-Replayed: true`.
  The original response has no such header. Replay precedes version checking.
- Same scope with a different fingerprint returns `422 idempotency-key-reused`.
- A different key cannot save an already-saved version: `409 version-conflict`.
- Only successful saves reserve a key; a rejected request may be corrected and
  retried with the same key. Storage failures roll back the snapshot and key.
- Successful keys are retained for at least 24 hours across process restarts.
  Concurrent identical requests serialize at the database transaction: the second
  replays. Concurrent saves with different keys yield one success and one 409.
  There is no separate in-flight problem type in this synchronous transaction design.
- Group readers may see only the saved snapshot after a successful transaction.
  Replaying a receipt does not publish again or bypass current access checks.

### PA#2 implementation boundary

The route and final validator are real. SQLite is a local, single-process storage
adapter for the checkpoint; multi-instance deployment/Postgres is future work.
The catalog, matrix and weather used in tests are **synthetic fixtures**, not
verified real-world places or the class shared dataset (due after PA#2).
Accounts, draft editing, group-read endpoints and the LLM are not implemented here.
Sessions are backend-signed HMAC tokens; signing is a server/test provisioning
utility, not a public login endpoint. An unset signing secret fails closed.
Do not expose this checkpoint as a production travel-data service.

## 5. Versions and changes

Within `/api/v1`, only new optional fields or endpoints are additive. Changing a
field's meaning, requiredness, type, money unit, ownership rule, refusal rule,
error type/status, replay semantics or removing fields requires `/api/v2`.
Document a migration and an explicit Sunset date before retiring v1; no v1
retirement date is set. Contract changes require an explanation and tests; tests
must not be edited alongside a bug fix merely to make it green.

## References

- Class brief, sections 3 and 6: final validator, confirmations, backend money,
  checked data, caps, motorbike gaps and rain threshold.
- PA#2 rubric, criteria 5 and 6; IA#3 course starter `CONTRACT.md` sections 1-5.
- [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457).
