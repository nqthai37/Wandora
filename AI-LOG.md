# AI-LOG

## Tools

| Tool                          | Used for                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------- |
| Claude Code (Claude Opus 5.5) | Harness: Next.js scaffold, check scripts, `CLAUDE.md`, permissions, CI workflow |

## Changed

- **`create-next-app` dependency conflict.** The generated `package.json` pinned
  `@types/node@^20`, and installing Vitest 5 failed with a peer conflict. Changed to
  `@types/node@^24` to match the Node 24 we run.
- **Typecheck failed on a clean checkout.** `tsc --noEmit` failed with
  `Cannot find name 'LayoutProps'`: Next 16 generates that type into `.next/types`, which a fresh
  clone does not have. Changed the script to `next typegen && tsc --noEmit` so the one command
  works from a fresh clone and in CI.

## Rejected

- **`npm install --force` / `--legacy-peer-deps`** for the Vitest peer conflict, which npm
  suggested. It would install a combination npm already said was broken, and every fresh clone
  would need the same flag. Fixed the version instead (see Changed).
- **Denying `Read(.env.*)` in `.claude/settings.json`**, the first draft of the permissions. It
  also blocks `.env.example`, which the assistant needs to read. Listed the real secret files
  (`.env`, `.env.local`, `.env.*.local`, `.env.development`, `.env.production`) instead.
