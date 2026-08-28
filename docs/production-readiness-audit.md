# Production readiness audit

Baseline recorded against a clean checkout before intentional repairs.

## Environment

| Item            | Value                                      |
| --------------- | ------------------------------------------ |
| Starting commit | `d8036f5b6412d2e4037c43fe2a950771d0da3591` |
| Branch          | `main` (matches `origin/main`)             |
| Working tree    | clean at baseline                          |
| Node            | `v24.5.0`                                  |
| npm             | `11.6.2`                                   |
| Lockfile        | `lockfileVersion: 3`                       |

## Clean baseline procedure

1. Removed `node_modules`, `dist`, `dist-app`, `coverage`, `storybook-static`, `api-docs` only.
2. Ran `npm ci` from the committed lockfile.
3. Ran existing verification commands individually.

## Package scripts (committed)

`dev`, `build` / `build:lib` / `build:app`, `build:storybook`, `storybook`, `test:storybook`, `test:storybook-visual`, `preview`, `typecheck`, `lint`, `format` / `format:check`, `test` / `test:watch` / `test:coverage`, `test:package`, `test:ssr`, `test:exports`, `size`, `docs:api`, `pack:dry-run`, `verify`.

## Confirmed failures

| Check                              | Result                | Evidence                                                                                                                                                       |
| ---------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run format:check`             | **FAIL**              | Prettier reported style issues in **89** committed files (DevTools, examples, stories, docs, `package.json`, lockfile, etc.).                                  |
| `npm run size` (after `build:lib`) | **FAIL**              | `devtools.min.js` **37076 B** (budget **34000**); `devtools.min.js.gz` **9496 B** (budget **9000**). Core / resolver within budget.                            |
| `form.batch()` non-Error throw     | **Contract mismatch** | Docs say the original exception is rethrown. Implementation wraps non-`Error` values in `new Error('form.batch() callback failed', { cause })` (`useForm.ts`). |

## Commands that passed at baseline

| Check               | Result                                                     |
| ------------------- | ---------------------------------------------------------- |
| `npm ci`            | **PASS** on this host (Node 24.5.0 / npm 11.6.2 / Windows) |
| `npm run typecheck` | **PASS**                                                   |
| `npm run lint`      | **PASS**                                                   |

## Independent-audit claims (reproduced vs not)

### Lockfile / `@emnapi/*` (Phase 1 claim)

**Not reproduced on this host.** `npm ci` succeeded after deleting `node_modules`. Registry latest `@emnapi/core` / `@emnapi/runtime` is `1.11.3`; the lockfile pins nested optional copies at `1.9.2` and `1.11.2` under wasm32 optional packages. Top-level `node_modules/@emnapi/core` is not required on this Windows install path. `npm install --package-lock-only` reported no lockfile drift. Follow-up applied: `engines`, `lockfile:check` (`npm ci --dry-run`), and install docs.

### Formatting (Phase 2)

**Confirmed.** See failures table.

### DevTools size / monolith (Phase 3)

**Confirmed.** Measured sizes exceed budgets. `FormDevTools.tsx` is ~920 non-blank lines / ~985 total and owns panel UI, persistence, serialization display, and styles together.

### Storybook themes (Phase 4)

**Done for this repair.** Storybook is light-only: manager always uses `docsLightTheme`, preview always applies `data-theme="light"`, dark/system helpers and `[data-theme='dark']` tokens are removed. Do not restore a dark/system toolbar.

### Storybook IA duplication (Phase 5)

**Addressed.** Sidebar order is Introduction → Getting Started → Core Concepts → Hooks → Fields → Validation → State & Performance → DevTools → Complete Examples (E2E only) → Accessibility → API Reference → Migration → Limitations. Concept demos live under Validation/Fields/Core/Hooks; Complete Examples keeps Login, Registration, Checkout, Async profile defaults, and DevTools playground only.

### Storybook browser verification (Phase 6)

**Confirmed gap.** `test:storybook` is Vitest/RTL mirroring, not real CSF `play` in a browser. `test:storybook-visual` exists but is outside `verify`. A11y addon is configured; it does not gate the main local verify path via real browser runs.

### Batch exception contract (Phase 7)

**Confirmed.** See contract mismatch above.

### `useForm.ts` size (Phase 8)

**Confirmed size.** ~2166 non-blank / ~2387 total lines. Extraction is optional if risk outweighs benefit; plan or incremental splits only.

### Import convention drift (Phase 9)

**Confirmed docs tension.** `.ai/skills/typescript-conventions.md` and `code-quality.md` prefer directory barrels; Phase 9 asks for one agreed convention (public barrels OK; internals may prefer direct modules).

### CI / release readiness (Phase 10)

**Confirmed gap.** No `.github/workflows` (or other provider CI). Release identity fields remain blockers (`private: true`, generic name, no invented license/author/URLs).

## Other baseline size measurements (after `build:lib`)

| Bundle                | Bytes     | Budget    |
| --------------------- | --------- | --------- |
| `core.min.js`         | 81653     | 100000    |
| `core.min.js.gz`      | 20979     | 26000     |
| `devtools.min.js`     | **37076** | **34000** |
| `devtools.min.js.gz`  | **9496**  | **9000**  |
| `resolver.min.js`     | 5253      | 7000      |
| `resolver.min.js.gz`  | 1862      | 2500      |
| `rules-only.min.js`   | 10777     | 14000     |
| `useForm-only.min.js` | 65029     | 80000     |

## Key dependency versions (from lockfile / `npm ls`)

| Package     | Version |
| ----------- | ------- |
| `react`     | 19.2.8  |
| `vite`      | 8.2.1   |
| `vitest`    | 4.1.10  |
| `storybook` | 10.5.8  |

## Suggestions (not baseline blockers by themselves)

- Add real Storybook + a11y browser gate (and document if it stays CI-only).
- Document DevTools `react-dom` peer requirement explicitly. **Done** — see `docs/devtools.md` and `docs/public-api.md`.
- Align import guidance across ESLint / `.ai` / code.
- Add GitHub Actions only because the remote is GitHub and the owner task requests provider-appropriate CI.

## Policy notes for this repair

- Do not publish, tag, push, or deploy Storybook.
- Do not weaken budgets, coverage, lint, or format rules to hide failures.
- Do not move `src/hooks/useForm`.
- Dark mode / system theme: **remove**, do not restore.

---

## Repair completion (2026-08-28)

All ten phases applied on top of starting commit `d8036f5`. Final verification from a **clean** tree: delete `node_modules` → `npm ci` → `npm run verify:ci` **PASS** on Node `v24.5.0` / npm `11.6.2` / Windows.

### Final verification evidence

| Command | Result |
| ------- | ------ |
| `npm ci` (clean) | **PASS** |
| `npm run verify` | **PASS** — lockfile, typecheck, lint, format, 548 unit tests, coverage, build:lib, package/ssr/exports tests, size, docs:api, storybook build, storybook Vitest (15), pack:dry-run, build:app |
| `npm run verify:ci` | **PASS** — verify + Playwright Chromium + `test:storybook-browser` (42 suites / 53 tests) + `test:storybook-visual` (light desktop + mobile smoke) |

### Size budgets (after repair)

| Bundle | Bytes | Budget |
| ------ | ----- | ------ |
| `devtools.min.js` | 32456 | 34000 |
| `devtools.min.js.gz` | 8991 | 9000 |
| `core.min.js.gz` | 20979 | 26000 |
| `resolver.min.js.gz` | 1862 | 2500 |

DevTools split into `components/`, `hooks/`, `dirtyFields.ts`, `styles.ts` (JS string). Uses `useDevToolsSnapshot` instead of `useFormState` to keep `pathUtilities` out of the DevTools graph.

### Resolved baseline failures

| Item | Resolution |
| ---- | ---------- |
| Format drift (89 files) | Prettier applied; `format:check` green |
| DevTools over budget | Refactored + trimmed JS-string styles; gzip **8991 B** |
| `form.batch()` throw contract | Rethrows exact original value; tests in `formBatch.test.ts` |
| No real browser Storybook gate | `test:storybook-browser` + axe in `verify:ci`; `.github/workflows/ci.yml` |
| Dark/system Storybook themes | Removed; light-only per owner override |
| Duplicate Examples sidebar | IA reorganized; five Complete Examples remain |
| No CI | GitHub Actions matrix Node 20.19 + 22 |

### Intentionally not done (documented)

- **`useForm.ts` extraction** — plan only in `docs/useform-maintainability.md` (incremental; no large split).
- **Release identity** — still `private: true`, generic package name; no invented license/author/URLs.
- **npm audit** — `npm ci` reports advisories; not auto-fixed with `--force`.

### Policy compliance

- Nothing published, tagged, pushed, or deployed.
- Budgets, lint, format, and test counts unchanged.
- `src/hooks/useForm/**` preserved in place; public APIs unchanged.
