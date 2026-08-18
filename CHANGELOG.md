# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Added

- Library build (`npm run build:lib`) with ESM output, declarations, and package `exports` for core, DevTools, and the Standard Schema adapter
- Isolated packed-package consumer, SSR, export, archive, and bundle-size checks
- Storybook workspace and TypeDoc API generation (local only)
- `FormDevTools` `hideFileNames` plus documented filename-privacy and proxy/getter limits
- Lifecycle rejection inside `form.batch()` for `validate`, `validateField`, `handleSubmit`, and `reloadDefaultValues`
- Ancestor-path skip in dirty/touched value extraction so parent arrays stay arrays

### Changed

- `standardSchemaResolver` moved out of the core barrel to `src/resolvers/standard-schema`
- Demo Vite output now writes to `dist-app/`; `dist/` is the library build
- React moved to `peerDependencies` (`^19.0.0`); the demo keeps React in `devDependencies`

### Fixed

- Async `form.batch()` callbacks restore transaction depth and document that pre-await mutations are not rolled back
