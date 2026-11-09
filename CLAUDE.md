# Wandora — rules for the coding assistant

AI Travel Planner for groups visiting Ho Chi Minh City. Read `AGENTS.md` too: Next.js 16 differs
from older versions; check `node_modules/next/dist/docs/` before using a Next API.

## Stack

- Next.js 16 (App Router) + TypeScript, one app for UI and API. Node 24, npm.
- `src/app/` pages and route handlers · `src/server/` backend-only code · `tests/` Vitest.
- Model: Google Gemini, called from server code only.

## Commands

| Check    | Command                |
| -------- | ---------------------- |
| Lint     | `npm run lint`         |
| Format   | `npm run format:check` |
| Types    | `npm run typecheck`    |
| Tests    | `npm test`             |
| All four | `npm run check`        |

Run `npm run check` before saying a change is done. CI runs these same commands.

## Conventions

- API errors are RFC 9457 problem details (`application/problem+json`, with `type`, `title`,
  `status`, `detail`).
- Money is computed by code only, never by the model.
- The model reaches data only through the seven tools (`get_profile`, `search_places`, `get_menu`,
  `get_travel_time`, `get_weather`, `compute_cost`, `validate_plan`).
- Code that holds a key or talks to the model lives in `src/server/` and starts with
  `import "server-only";`.
- Work on a branch and open a pull request.

## Never

- Put a model key in client code, or name a key variable `NEXT_PUBLIC_*`.
- Make a real model call in a unit test. Mock the model client.
- Edit a test, the eval data or a validator rule to make a check pass. Fix the code, or change
  the contract first and say so.
- Send names or email addresses to the model. Only places and interests.
- Add `|| true`, `continue-on-error` or `--passWithNoTests` to a check.
- Push straight to `main`, or rewrite history that is already pushed.

## Permissions

Enforced in `.claude/settings.json`.

- **Allowed:** the check commands above, `npm run dev`, read-only git (`status`, `diff`, `log`).
- **Ask first:** `git commit`, `git push`, `gh pr …`, `npm install …`, editing `.github/` or
  `.claude/`.
- **Never:** reading `.env` files (except `.env.example`), force-push, pushing to `main`,
  `rm -rf`.
