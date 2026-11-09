# Wandora

AI Travel Planner: a day-by-day schedule and spending plan for a group visiting Ho Chi Minh City.
CSC13114 Advanced Web Application Development, class 23KTPM1.

## Setup

Requires Node 24 and npm.

```bash
npm ci
cp .env.example .env
npm run dev
```

Fill in `.env` locally. It is git-ignored and must never be committed.

## Checks

Each check is one command. CI runs exactly these.

| Check    | Command                |
| -------- | ---------------------- |
| Lint     | `npm run lint`         |
| Format   | `npm run format:check` |
| Types    | `npm run typecheck`    |
| Tests    | `npm test`             |
| All four | `npm run check`        |

`npm run format` fixes formatting. CI also runs gitleaks over the whole git history.

## Model and cost

- **Provider:** Google Gemini, through a Google AI Studio API key, called from server code only.
- **Spending cap:** the key's Google Cloud project is on the free tier with **no billing account**,
  so the key cannot be charged. If billing is ever turned on, a budget with alerts is set first
  and this section is updated.
- **Model and cost per plan:** chosen and measured in PA#3.

## Contributing

Work on a branch and open a pull request into `main`. CI must be green to merge.
Rules for the coding assistant are in [`CLAUDE.md`](CLAUDE.md).
