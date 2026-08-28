# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Added

- MIT `LICENSE` and package metadata for planned npm identity `@muradyanvano/use-form`
- `docs/package-identity-migration.md` inventory for the scoped package rename

### Changed

- Consumer-facing docs, Storybook snippets, and README use `@muradyanvano/use-form` instead of `<package-name>`
- `npm pack --json` parsing in package consumer tests (no guessed tarball names)
- Planned version `0.1.0-beta.1`; repository, homepage, bugs, and author metadata in `package.json`

## [0.1.0-beta.1] — unpublished (prepared)

First planned beta. **Not published to npm.** Requires owner authorization, `private: false`, and `npm publish --access public --tag beta`.

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
