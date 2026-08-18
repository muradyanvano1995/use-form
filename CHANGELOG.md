# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Added

- Production-oriented Storybook documentation: semantic light/dark/system theming, landing pages, Getting Started, hierarchy, Controls/Actions, play tests, and local visual smoke
- Docs UI copy button on `CodePanel` (`Copy code`, clipboard API with `execCommand` fallback, keyboard activation, status restore)
- Shared consumer snippets for Storybook Docs (`src/stories/snippets/consumerSnippets.ts`) using `<package-name>` imports
- Documented future proposal for `form.refreshErrorMessages()` (not implemented; built-in type/params only)
- Checkout, radio/checkbox, Standard Schema, and watchers example forms
- `docs/storybook.md` contributor guide and `docs/storybook-audit.md` pre-implementation audit
- `@storybook/addon-docs` (autodocs + Storybook Source / Show code / copy)
- `FormDevTools` CSS variables so the inspector follows the active documentation theme

### Changed

- Example CSS uses documentation tokens instead of light-only hardcoded colors
- Storybook backgrounds addon is disabled; the theme toolbar owns the canvas
- Storybook Docs autodocs is enabled so consumer `source.code` snippets appear on Docs pages
- Localized registration example revalidates visible errors after locale catalogs commit (core `useForm` still does not rewrite resolved strings)

### Fixed

- Example and DevTools contrast in dark preview
- Order and resolver demos no longer `console.info` form values (which could include files)
- Internationalization demo left English errors visible after switching language until a manual Revalidate click

### Changed

- `standardSchemaResolver` moved out of the core barrel to `src/resolvers/standard-schema`
- Demo Vite output now writes to `dist-app/`; `dist/` is the library build
- React moved to `peerDependencies` (`^19.0.0`); the demo keeps React in `devDependencies`

### Fixed

- Async `form.batch()` callbacks restore transaction depth and document that pre-await mutations are not rolled back
