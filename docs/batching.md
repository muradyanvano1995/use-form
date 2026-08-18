# Atomic batching

`form.batch(callback, options?)` groups several mutations into **one store notification** and at most **one coordinated validation pass**.

```ts
await form.batch(() => {
  form.setValue('address.city', 'Yerevan')
  form.setValue('address.country', 'Armenia')
  form.clearError('address.postalCode')
})
```

## Contract

- The callback **must be synchronous**. Async callbacks throw at runtime when they return a thenable (TypeScript `() => void` cannot reliably reject `async` functions at compile time).
- Mutations run immediately in callback order. `getState()` / getters inside the callback see the latest values.
- External subscribers (`useForm`, `useWatch`, …) are notified only after the **outermost** batch exits, and only if the **final snapshot reference** changed (`Object.is`). `setValue` allocates a new snapshot, so a change-then-restore still notifies. There is no deep equality pass.
- The returned promise resolves after queued **immediate** validation finishes. It does **not** wait for ordinary `rules.async` change-debounce timers unless the batch forces a complete validation cycle (`shouldValidate: true` uses reason `manual`, which bypasses debounce).

```ts
type BatchOptions = { shouldValidate?: boolean }
```

`batch(callback, { shouldValidate: true })` runs one complete validation cycle after the callback. Per-operation `shouldValidate: false` does **not** override that force. Without a batch-level force, only operations that would normally validate are queued (same mode / `shouldValidate` rules as outside a batch).

Do not write `await form.batch(async () => { … })`. Nested public batches join the outer transaction; do not `await` an inner `batch()` inside the outer callback. `void form.batch(() => { … })` is fine. Inner returned promises settle when the outer batch finishes.

If an async function is passed anyway:

- The thenable is detected after the **synchronous** portion of the callback.
- Transaction depth is restored; queued automatic validation is cancelled; notification is flushed (same as other callback exceptions).
- Mutations that already ran before the first `await` **remain applied**. Batching does not roll back.
- Later work in that async continuation is **not** part of the batch and must not be used for further mutations.
- Perform asynchronous work **before or after** the batch.

## Validation

Queued field paths and dependents are **deduplicated** in declaration order. Intermediate values are not validated. The flush uses the final values snapshot. Whole-form resolver/form validation runs at most once per batch when `setValues`, field-array mutations, unregister `shouldValidate`, or `batch(..., { shouldValidate: true })` request it — not once per `setValue`.

Debounced fields: one timer per affected field, scheduled from final values. Pending older timers are cancelled by the existing scheduler. Stale results cannot commit.

These lifecycle operations **cannot** run inside a batch. They throw a named error synchronously so `void form.validate()` cannot silently validate intermediate state:

- `validate()`
- `validateField()`
- `handleSubmit()`
- `reloadDefaultValues()`

Example: `validate() cannot be called inside form.batch(). Complete the batch first, then validate.`

Complete the batch first, then validate or submit. `reset` / `unregister` / `setValue` still participate in the transaction.

## Exceptions

There is **no rollback**. If the callback throws:

- Mutations already applied stay applied.
- Deferred notification is flushed.
- Queued automatic validation is cancelled.
- Transaction depth is restored (`try/finally`).
- The original exception is rethrown.

## Field arrays, reset, unregister, async defaults

Field-array methods participate. Keys, values, and metadata reindexing use the final structure. Obsolete post-render focus requests are cancelled by the existing focus generation counter (the last mutation in the batch wins).

`reset`, `resetField`, and `unregister` participate. They drop queued field validation for affected paths so late results cannot resurrect cleared errors.

An async defaults loader must not join a user callback. If a loader commits while a batch is open, the store still applies state immediately and **defers notification** with the open transaction. No deadlock; loading flags stay coherent.

## Snapshot notifications

Notification uses **store snapshot identity**, not deep comparison of values. An empty batch does not notify. A batch that calls `setValue` even when the semantic value matches the start still notifies, because `setValue` allocates a new snapshot.

## Limitations

- Callbacks cannot be async (no designed async transaction).
- Thrown batches do not restore previous values.
- The batch promise does not wait for change-debounce delays.
- Lifecycle operations listed above are rejected inside a batch (not queued).
