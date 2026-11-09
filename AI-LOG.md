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
- **Lint passed with a warning: a CI step that could not fail.** The assistant's first lint script
  was `eslint .`, and PR #1's `lint` job was green. While proving each job can go red, an unused
  variable left `npm run lint` at exit 0: `eslint-config-next` sets `no-unused-vars` to `warn`,
  and ESLint only fails on errors. Changed the script to `eslint . --max-warnings=0` and added a
  line to the `CLAUDE.md` "Never" list.

## Proof that the checks can fail

PR #2 (`ci/prove-red`, closed without merging) added one deliberate break per check. CI run
https://github.com/nqthai37/Wandora/actions/runs/42612115976 shows each job red for the planted
reason: `lint` (unused variable), `format` (Prettier check), `typecheck` (string assigned to
`number`), `test` (`expect(1).toBe(2)`). `secrets` was not forced red: that would mean committing
a key-shaped string, and the history must stay free of anything that looks like a secret.

- **The secrets job did not scan the whole history.** A fresh-context review of the branch found
  that `gitleaks/gitleaks-action@v2`, which the assistant wrote into CI, scans only a PR's own
  commits, and nothing at all on a tag push, while the README said "whole git history". Replaced
  it with the gitleaks CLI (8.30.1, checksum verified) running `gitleaks git --log-opts="--all"`.
- **Tests next to the code were silently skipped.** Vitest only included `tests/**/*.test.ts`. A
  failing `src/server/*.test.ts` left `npm test` at exit 0. Widened the pattern to
  `{src,tests}/**/*.test.{ts,tsx}` so contract tests run wherever they live.

## Rejected

- **`npm install --force` / `--legacy-peer-deps`** for the Vitest peer conflict, which npm
  suggested. It would install a combination npm already said was broken, and every fresh clone
  would need the same flag. Fixed the version instead (see Changed).
- **Denying `Read(.env.*)` in `.claude/settings.json`**, the first draft of the permissions. It
  also blocks `.env.example`, which the assistant needs to read. Listed the real secret files
  (`.env`, `.env.local`, `.env.*.local`, `.env.development`, `.env.production`) instead.
