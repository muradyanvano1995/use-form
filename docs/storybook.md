# Storybook contributor guide

Storybook is the public-facing documentation site for this unpublished package. A successful `build:storybook` is necessary but not sufficient. Review light mode, dark mode, mobile width, and desktop width before merging documentation changes.

Do not publish, tag, push, or deploy Storybook.

## Organization

Titles are sorted in `.storybook/preview.ts`. Keep one concept per story. If two canvases look the same, the docs text must explain the difference (for example Built-in rules vs Custom rules both use registration, but Custom rules calls out `createRule`).

| Area                   | Path                           |
| ---------------------- | ------------------------------ |
| Tokens and preview CSS | `src/stories/styles/`          |
| Docs UI                | `src/stories/components/`      |
| Theme helpers          | `src/stories/theme/`           |
| Preview decorator      | `src/stories/preview/`         |
| CSF stories            | `src/stories/**/*.stories.tsx` |
| Example forms          | `src/examples/`                |

## Theme

Three layers, all Storybook-native:

1. **Manager** — `.storybook/manager.ts` + `create()` themes. Follows the preview `theme` global.
2. **Preview / Docs** — toolbar `light` | `dark` | `system`. Decorator sets `data-theme` and `color-scheme`, syncs Docs theme, listens to `prefers-color-scheme` in system mode and removes the listener on change. `preview-head.html` applies the URL global before React to reduce flashes. Initial global is `light`.
3. **Examples** — semantic `--docs-*` variables in `tokens.css`. `examples.css` consumes them. Do not add per-story palettes. Do not import `src/index.css` or `App.tsx`.

Backgrounds addon is **disabled**. The theme owns the canvas.

DevTools uses `--form-devtools-*` with hardcoded fallbacks so it still renders outside Storybook.

## Adding a story

1. Prefer wrapping an example in `src/examples` over inventing a one-off form.
2. Set `title` to match the sidebar hierarchy.
3. Document the public API, how to interact, expected behavior, and limits.
4. Put consumer copy in `parameters.docs.source.code` using `<package-name>` imports, not `../lib`.
5. Add `play` only for critical user flows. Query by role and name.

## Controls

Use Controls when changing an arg teaches something (`mode`, `disabled`, `locale`, `shouldUnregister`, `loadOutcome`, DevTools `position`).

Give every control a `description`. Use `select`/`radio` only for valid public values. Disable or omit internal objects. If a story is static documentation, set `parameters.controls.disable: true` and say so in the docs text.

Do not sync form state back into Storybook args unless that is the lesson.

## Actions

Use `fn()` from `storybook/test` on typed callback args. Capture submit success/invalid, reset, array append/remove, locale change, async load results. Do **not** log passwords, tokens, or file contents. Use `src/stories/preview/safeActions.ts` when serializing values. Do not log every keystroke.

## Play tests

- Import `expect`, `fn`, `userEvent`, `waitFor`, `within` from `storybook/test`.
- No arbitrary `sleep`. Use `waitFor` for 120–500ms deterministic fakes.
- Blur async username checks instead of waiting for the 400ms debounce.
- Keep unit tests in `*.test.ts` beside implementation files.

`npm run test:storybook` runs Vitest against `src/stories` (theme helpers plus RTL flows in `src/stories/storyPlay.test.tsx` that cover the same user paths as CSF `play` functions). Those files also run in `npm test`.

## Accessibility

`@storybook/addon-a11y` is enabled with `a11y.test: 'error'`. Fix violations instead of disabling rules. Static prose pages may use `a11y.test: 'todo'` when they are not interactive widgets. Associate errors with `getErrorId`. Do not put `role="alert"` on every field error. Root errors are not focus targets.

## Responsive review

Viewports: small mobile 320, large mobile 414, tablet 768, desktop 1280, wide 1600. Check that rows stack, buttons stay usable, and inline DevTools does not cover the form.

## Visual review checklist

For every major story:

1. Light preview
2. Dark preview
3. Mobile width
4. Desktop width
5. Validation errors, success, loading, server errors
6. Focus-visible rings
7. Controls and Actions
8. Browser console

`npm run test:storybook-visual` screenshots `storybook-static` via local Playwright. Screenshots stay in gitignored `storybook-visual/`. Do not upload them or enable Chromatic.

## Sensitive data

Never send passwords, tokens, or file bytes to Actions, `console`, or DevTools (except redacted metadata).
