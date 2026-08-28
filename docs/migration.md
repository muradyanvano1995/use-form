# Migration policy

The package is published on npm as `@muradyanvano/use-form`. The same policy is documented in Storybook under **Migration**.

## Current stability

Treat the public inventory in [public-api.md](public-api.md) as the intended 0.x surface:

- **Stable public API** — keep unless a documented breaking change is required before 1.0.
- **Experimental** — may change without a migration guide until 1.0.
- **DevTools-only / resolver-entry-only** — import from the documented subpath, not core.

`standardSchemaResolver` is not exported from the core barrel. Import it from `@muradyanvano/use-form/resolvers/standard-schema`.

## 0.x releases

- Breaking changes should land in a new minor or major according to the chosen 0.x policy, with a changelog entry.
- Document migrations when a release changes consumer-facing behavior.
- React peer range stays honest: only versions that are tested.

## Installing specific lines

- Stable: `npm install @muradyanvano/use-form`
- Prerelease: `npm install @muradyanvano/use-form@beta`
- Exact version: see [CHANGELOG.md](../CHANGELOG.md)
