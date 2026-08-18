# React conventions

## Hooks

- Follow the Rules of Hooks.
- Keep option callbacks in refs when the public method identity should stay stable across renders (`useForm` does this for `validate`, `onSubmit`, modes, etc.).
- Use `useEffect` only for genuine subscriptions / lifecycle (for example mounted flags). Do not derive dirty/valid state in effects.
- Prefer immutable state updates. Never mutate `values`, `errors`, or caller-owned `defaultValues`.

## Components

- Example forms live in `src/examples` and are wired from `App.tsx` and Storybook.
- Storybook examples must stay readable in light and dark `data-theme` using `--docs-*` tokens. Do not add per-story palettes or import `src/index.css`.
- Keep forms accessible: labels, stable ids, `aria-invalid`, `aria-describedby`, keyboard submit, disabled submit while submitting. Prefer field errors linked by id over `role="alert"` on every field.
- Controlled custom inputs should use `useController({ control, name })` (or context inside `FormProvider`), not a second ad-hoc binding layer.
- Prefer `register()` for native HTML controls.
- Pass only `form.control` into `FormProvider` — never the full `useForm` return value.

## Strict Mode

- Assume React Strict Mode is enabled (`src/main.tsx`).
- Async work must check mounted state / generation counters before calling `setState`.
