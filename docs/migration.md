# Migration policy

There is **no published release** yet, so there are no version-to-version migrations. The same policy is documented in Storybook under **Migration**.

## Current stability

Treat the public inventory in [public-api.md](public-api.md) as the intended 0.x surface:

- **Stable public API** — keep unless a documented breaking change is required before 1.0.
- **Experimental** — may change without a migration guide until 1.0.
- **DevTools-only / resolver-entry-only** — import from the documented subpath, not core.

`standardSchemaResolver` was removed from the core barrel before any publish. Import it from `@muradyanvano/use-form/resolvers/standard-schema`.

## After 0.x publishes

- Breaking changes should land in a new minor or major according to the chosen 0.x policy, with a changelog entry.
- Do not invent migrations for unpublished snapshots.
- React peer range stays honest: only versions that are tested.
