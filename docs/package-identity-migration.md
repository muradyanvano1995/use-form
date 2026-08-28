# Package identity migration inventory

> **Historical audit (2026-08-28).** The package is now published as `@muradyanvano/use-form`. Do not treat tables below as current release guidance — see [releasing.md](releasing.md) and [CHANGELOG.md](../CHANGELOG.md).

Baseline recorded before identity migration edits on **2026-08-28**.

| Item            | Value                                        |
| --------------- | -------------------------------------------- |
| Starting commit | `37ac041aa40fdd0d82b2f59c60c79f8093be34fe`   |
| Node            | v24.5.0 (local baseline)                     |
| npm             | 11.6.2 (local baseline)                      |
| Target name     | `@muradyanvano/use-form`                     |
| Target version  | `0.1.0-beta.1`                               |
| Repository      | https://github.com/muradyanvano1995/use-form |

Pre-change verification (same commit): `npm ci` succeeded locally. Full `npm run verify` was run after migration (see final report).

## Search categories

### Must change (consumer-facing / package metadata)

| Location                                   | Before                             | After                                                 |
| ------------------------------------------ | ---------------------------------- | ----------------------------------------------------- |
| `package.json` `name`                      | `react-hooks`                      | `@muradyanvano/use-form`                              |
| `package.json` `version`                   | `0.0.0`                            | `0.1.0-beta.1`                                        |
| `package.json` metadata                    | absent                             | `license`, `author`, `repository`, `homepage`, `bugs` |
| `package-lock.json` root name/version      | `react-hooks` / `0.0.0`            | regenerated via `npm install`                         |
| `LICENSE`                                  | absent                             | MIT © 2026 Vano Muradyan                              |
| `README.md`                                | `<package-name>`, generic blockers | scoped name, beta wording, full consumer guide        |
| `CHANGELOG.md`                             | placeholder imports                | prepared `0.1.0-beta.1` (unpublished)                 |
| `docs/*.md` consumer imports               | `<package-name>`                   | `@muradyanvano/use-form`                              |
| `src/stories/snippets/consumerSnippets.ts` | `<package-name>`                   | `@muradyanvano/use-form`                              |
| Storybook docs pages                       | placeholders                       | scoped imports + beta install copy                    |
| `src/examples/*` UI copy                   | `<package-name>`                   | scoped subpaths                                       |
| `scripts/storybook-visual.mjs`             | asserts `<package-name>` in copy   | asserts `@muradyanvano/use-form`                      |
| `scripts/test-package.mjs`                 | `npm pack` + no LICENSE            | `npm pack --json`, LICENSE required, SSR from tarball |
| `index.html` `<title>`                     | `react-hooks`                      | demo title with scoped name                           |
| `.ai/skills/*.md`                          | placeholder guidance               | scoped package guidance                               |

### Internal identifier — may remain

| Location                                 | Reason                                             |
| ---------------------------------------- | -------------------------------------------------- |
| `eslint-plugin-react-hooks` dependency   | npm package name, unrelated                        |
| `eslint-disable-next-line react-hooks/*` | ESLint rule namespace                              |
| `AGENTS.md` repo folder name             | describes git checkout; also notes scoped npm name |
| GitHub repo path `use-form`              | not renamed per owner constraint                   |

### Generated / lockfile nested names

| Location                                          | Reason                                  |
| ------------------------------------------------- | --------------------------------------- |
| `package-lock.json` → `eslint-plugin-react-hooks` | transitive dependency                   |
| `dist/`, `storybook-static/`, `coverage/`         | build output (gitignored or not packed) |

### Intentional historical references

| Location                              | Reason                                               |
| ------------------------------------- | ---------------------------------------------------- |
| `docs/storybook-audit.md` dated audit | pre-migration snapshot; updated import examples only |
| `CHANGELOG.md` older sections         | historical notes preserved                           |

## Public entry points (unchanged map)

| Subpath                       | Build output                              |
| ----------------------------- | ----------------------------------------- |
| `.`                           | `dist/lib/index.js`                       |
| `./devtools`                  | `dist/devtools/index.js`                  |
| `./resolvers/standard-schema` | `dist/resolvers/standard-schema/index.js` |
| `./package.json`              | `package.json`                            |

## Tarball naming

Scoped packages produce filenames like:

`muradyanvano-use-form-0.1.0-beta.1.tgz`

Scripts use `npm pack --json` and read `filename` from the first entry — no hardcoded tarball guesses.

## Remaining release blockers (after migration)

1. Owner authorization to set `private: false` and run `npm publish --access public --tag beta`.
2. npm scope `@muradyanvano` access and 2FA.
3. Optional: dedicated security contact (currently GitHub Issues).
4. Storybook deployment (local only; not a publish blocker for the library tarball).

## Owner approval recorded

- **MIT license** approved with copyright holder **Vano Muradyan** (2026).
