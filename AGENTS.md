# Agent instructions

You are working in the `use-form` repository (npm package `@muradyanvano/use-form`).

## Before changing code

1. Read `.ai/README.md`.
2. Open every relevant file under `.ai/skills/` for the task you are about to perform.
3. Inspect the existing implementation and tests before proposing or writing changes.

## After changing code

1. Follow [docs/development-workflow.md](docs/development-workflow.md) and `.ai/skills/change-workflow.md` (classify the change; pick verification Level 1–3).
2. Update every affected skill file under `.ai/skills/` so documentation matches the final behavior.
3. Run the applicable verification scripts (`typecheck`, `lint`, `format:check`, `test`, `build`, or `npm run verify` / `verify:ci` as required).
4. Do not leave docs describing removed or planned-only behavior.

## Form work

For anything involving forms, start with `.ai/skills/form-system.md` and `.ai/skills/validation.md`.
