# Wandora harness — design (PA#2, Person A)

**Date:** 2026-11-09 · **Owner:** Person A (harness and gate) · **Repo:** https://github.com/nqthai37/Wandora

## Goal

Lay the ground for AI Travel Planner before the LLM feature arrives in PA#3: rules the
assistant works under, one command per check, CI that runs those checks on every change, and
(once repo permission is granted) a protected `main` where those checks are required.
Covers PA#2 rubric criteria 1–4. The endpoint contract and its tests (criteria 5–6) belong to
Person B and are out of scope here.

## Decisions

| Decision        | Choice                                             | Why                                                                                   |
| --------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Stack           | Next.js (App Router) + TypeScript, single app      | One codebase for UI and API; keys stay in server code. Same stack as the team's PA#1. |
| Package manager | npm, committed `package-lock.json`, `npm ci` in CI | Default with Node; a fresh clone installs exactly the locked versions.                |
| Database        | None in the harness                                | Person B adds storage for their endpoint; YAGNI until then.                           |
| Rules file      | `CLAUDE.md`                                        | The team uses Claude Code.                                                            |
| Location        | `E:\Documents\Advanced Web (AI)\Wandora`           | Next to the other course work.                                                        |

## Layout

```
src/app/            UI pages and API route handlers
src/app/api/health/ GET /api/health smoke route
src/server/         backend-only code (validator, cost, model client later)
tests/              Vitest tests
docs/contract/      Person B's endpoint contract
.github/workflows/  ci.yml
.claude/            settings.json (assistant permissions)
```

## Checks (criterion 3)

| Check    | Command                | Tool                         |
| -------- | ---------------------- | ---------------------------- |
| Lint     | `npm run lint`         | ESLint (Next.js config)      |
| Format   | `npm run format:check` | Prettier `--check`           |
| Types    | `npm run typecheck`    | `tsc --noEmit`               |
| Tests    | `npm test`             | Vitest (`vitest run`)        |
| All four | `npm run check`        | runs the four above in order |

The README documents exactly these commands; CI calls exactly these commands. A fresh clone
runs `npm ci` then `npm run check` and gets green.

## CI (criterion 4)

`.github/workflows/ci.yml`, triggered on `pull_request`, on `push` to `main`, and on `push` of
tags (so the `pa2` tag gets its own CI run to link from `PA2.md`).

Five jobs, each a separate status check so each can be marked required:

- `lint`, `format`, `typecheck`, `test`: checkout → setup Node 24 with npm cache → `npm ci` →
  the matching command from the table above.
- `secrets`: gitleaks over the full git history (`fetch-depth: 0`).

Rule for every step: nothing may hide a failure. No `|| true`, no `continue-on-error`, no
`--passWithNoTests`. Before relying on CI, each job is shown to go red once on purpose.

## Branch protection (deferred)

Turned on later, once Thái (repo owner) grants admin or does it himself. A ruleset on `main`:

- require a pull request (no approval count, so either member can merge their own PR);
- require the five checks, branch up to date with `main`;
- block force-push and deletion; no bypass, admins included.

Until then: work on branches and open PRs anyway, so the habit and the CI history exist.
Evidence for PA2.md after protection is on: one PR whose merge was blocked by a red check,
and the commit that turned it green. No history rewriting once evidence PRs exist.

## Rules file (criterion 1)

`CLAUDE.md`, kept short, four sections:

- **Stack:** the decisions table, condensed.
- **Commands:** the checks table.
- **Conventions:** API errors are RFC 9457 problem details; money is computed by code only;
  the model reaches data only through the seven tools; backend-only code lives in `src/server`.
- **Never:**
  - put a model key in client code: the model client imports `server-only`, and no key
    variable starts with `NEXT_PUBLIC_`;
  - make a real model call in unit tests: the model client is mocked;
  - edit a test, the eval data or a validator rule to make a check pass;
  - push straight to `main` or rewrite pushed history;
  - send names or email addresses to a model.

Lines with a story (at least two) are added as real mistakes happen and are logged in
`AI-LOG.md`, each pointing at its commit or log entry.

## Permissions and secrets (criterion 2)

`.claude/settings.json`, enforced by Claude Code, mirrored as a written three-tier list in
`CLAUDE.md`:

- **Allowed:** the npm check scripts, `npm run dev`, read-only git (`status`, `diff`, `log`).
- **Ask first:** `git commit`, `git push`, `gh pr …`, `npm install …`, editing CI or `.claude/`.
- **Never (deny):** reading `.env` / `.env.*` except `.env.example`, `git push --force`,
  pushing to `main`, `rm -rf`.

`.env.example` lists every variable with no values: `DATABASE_URL`, `GEMINI_API_KEY`,
`GEMINI_MODEL`. `.gitignore` covers `.env*` and keeps `.env.example`.

**Model provider: Google Gemini** (API key from Google AI Studio), server-side only.
The README has a "Model and cost" section: the Gemini model used, the cost of one plan
(measured in PA#3), and the spending cap. Cap: the key's Google Cloud project stays on the
**free tier with no billing account**, so it cannot be charged at all; if billing is ever
enabled, a budget with alerts is set first and the README is updated.

## Smoke test

`GET /api/health` returns `{ "status": "ok" }`; one Vitest test calls the route handler and
checks the body. It gives `npm test` something real before Person B's contract tests land.

## Evidence still to collect (not produced by the setup)

- Two `CLAUDE.md` "never" lines traced to real mistakes (commit or `AI-LOG.md` entry).
- Gemini key's project confirmed free tier / no billing (or a budget set); README states it.
- A fresh clone following the README gets `npm run check` green.
- Branch protection on; a PR blocked by a red check; the commit that turned it green.
- `AI-LOG.md` with real Changed / Rejected entries.
- Person B's contract tests are Vitest tests, so `npm test` and the required `test` job run them.

## Out of scope

Person B's endpoint, contract and contract tests; `PA2.md`, `SELF_ASSESSMENT_REPORT.md`,
the `pa2` tag and the zip (done together at the end).
