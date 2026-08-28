# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

## [0.1.0] - 2026-08-29

Prepared first stable-channel release. **Not published to npm yet** — requires owner authorization via the GitHub publish workflow (`version: 0.1.0`, `channel: latest`).

First stable successor to `0.1.0-beta.2`. The public API remains pre-1.0.

### Consumer-facing capabilities

- Typed form state with nested and indexed paths (depth 5)
- One-level field arrays and controlled components via `useController`
- Form context (`FormProvider`, subscription hooks)
- Built-in and custom validation, async and dependent validation, Standard Schema resolver entry
- Async default values, conditional fields and unregister
- Structured errors with i18n validation messages
- Non-reactive getters and atomic `form.batch()`
- Granular subscriptions (`useWatch`, `useFormState`, `useFieldState`)
- File fields (metadata only, no content reads)
- SSR-safe selector snapshots; resolver entry without React
- DevTools on a separate entry
- Accessible native registration and focus-on-error
- Documented public exports, local Storybook, TypeDoc, and packed-tarball consumer verification

## [0.1.0-beta.2] - 2026-08-28

Published to npm on the `beta` dist-tag.

### Changed

- Trusted Publishing workflow and npm beta channel publish path
- Release documentation and consumer install guidance for published betas

## [0.1.0-beta.1] - 2026-08-27

Published to npm (initial beta; `latest` dist-tag pointed here until a stable release ships).

### Public entry points

- `@muradyanvano/use-form` — core hooks, rules, and types (`'use client'`)
- `@muradyanvano/use-form/devtools` — `FormDevTools` (`'use client'`, requires `react-dom`)
- `@muradyanvano/use-form/resolvers/standard-schema` — `standardSchemaResolver` (no React)
- `@muradyanvano/use-form/package.json` — package metadata

### Added (included in this beta candidate)

- Production-oriented Storybook documentation: light-only theming, landing pages, Getting Started, hierarchy, Controls/Actions, play tests, and local visual smoke
- Docs UI copy button on `CodePanel` (`Copy code`, clipboard API with `execCommand` fallback, keyboard activation, status restore)
- Shared consumer snippets for Storybook Docs (`src/stories/snippets/consumerSnippets.ts`) using `@muradyanvano/use-form` imports
- Documented future proposal for `form.refreshErrorMessages()` (not implemented; built-in type/params only)
- Checkout, radio/checkbox, Standard Schema, and watchers example forms
- `docs/storybook.md` contributor guide and `docs/storybook-audit.md` pre-implementation audit
- `@storybook/addon-docs` (autodocs + Storybook Source / Show code / copy)
- `FormDevTools` CSS variables so the inspector follows documentation tokens

### Changed

- Storybook is light-only (no dark/system toolbar or dark token set)
- Storybook sidebar IA: Core Concepts → Hooks → Fields → Validation → State & Performance → DevTools → Complete Examples (E2E only)
- Example CSS uses documentation tokens instead of hardcoded colors
- Storybook backgrounds addon is disabled; the light theme owns the canvas
- Storybook Docs autodocs is enabled so consumer `source.code` snippets appear on Docs pages
- Localized registration example revalidates visible errors after locale catalogs commit (core `useForm` still does not rewrite resolved strings)
- Consumer-facing docs, Storybook snippets, and README use `@muradyanvano/use-form` instead of `<package-name>`
- `npm pack --json` parsing in package consumer tests (no guessed tarball names)
- Repository, homepage, bugs, and author metadata in `package.json`

### Fixed

- Linux `npm ci` failure (`Missing: @emnapi/core` / `@emnapi/runtime`) by adding those packages as devDependencies for `@napi-rs/wasm-runtime` peer resolution
- Order and resolver demos no longer `console.info` form values (which could include files)
- Internationalization demo left English errors visible after switching language until a manual Revalidate click

### Changed

- `standardSchemaResolver` moved out of the core barrel to `src/resolvers/standard-schema`
- Demo Vite output now writes to `dist-app/`; `dist/` is the library build
- React moved to `peerDependencies` (`^19.0.0`); the demo keeps React in `devDependencies`

### Fixed

- Async `form.batch()` callbacks restore transaction depth and document that pre-await mutations are not rolled back
