import { useCallback, useLayoutEffect, useMemo, useReducer } from 'react'
import type { FieldArrayItem, FieldArrayPath, FormValues } from './baseTypes.ts'
import { resolveControl, useOptionalFormContext } from './formContext.ts'
import {
  assertArrayIndex,
  assertInsertIndex,
  identityRemap,
  insertRemap,
  moveRemap,
  removeRemap,
  swapRemap,
  type FieldArrayMutationOptions,
  type IndexRemap,
} from './fieldArrayUtilities.ts'
import { getControlInternals, type FormControl } from './formStore.ts'
import { cloneFormValue, getValueAtPath, isPlainObject } from './pathUtilities.ts'
import { useWatch } from './subscriptions.ts'

export type { FieldArrayMutationOptions }

export type FieldArrayField<TItem> = {
  /** Stable React key — not part of form values. */
  key: string
  value: TItem
}

export type UseFieldArrayOptions<
  TValues extends FormValues,
  TName extends FieldArrayPath<TValues> = FieldArrayPath<TValues>,
> = {
  name: TName
  control?: FormControl<TValues>
}

export type UseFieldArrayReturn<TItem> = {
  fields: Array<FieldArrayField<TItem>>
  append: (value: TItem, options?: FieldArrayMutationOptions) => void
  prepend: (value: TItem, options?: FieldArrayMutationOptions) => void
  insert: (index: number, value: TItem, options?: FieldArrayMutationOptions) => void
  update: (index: number, value: TItem, options?: FieldArrayMutationOptions) => void
  remove: (index: number, options?: FieldArrayMutationOptions) => void
  swap: (firstIndex: number, secondIndex: number, options?: FieldArrayMutationOptions) => void
  move: (fromIndex: number, toIndex: number, options?: FieldArrayMutationOptions) => void
  replace: (values: TItem[], options?: FieldArrayMutationOptions) => void
  clear: (options?: FieldArrayMutationOptions) => void
}

function cloneArrayItem<TItem>(item: TItem): TItem {
  if (isPlainObject(item)) {
    return cloneFormValue(item)
  }
  return item
}

/**
 * Dynamic field arrays with stable keys and typed indexed paths (`products.0.name`).
 *
 * Keys live in control internals and never appear in submitted values.
 * Nested arrays inside items are not supported in this phase.
 */
export function useFieldArray<
  TValues extends FormValues,
  TName extends FieldArrayPath<TValues> = FieldArrayPath<TValues>,
>(
  options: UseFieldArrayOptions<TValues, TName>,
): UseFieldArrayReturn<FieldArrayItem<TValues, TName>> {
  type TItem = FieldArrayItem<TValues, TName>

  const context = useOptionalFormContext()
  const control = resolveControl(options.control, context, 'useFieldArray')
  const name = options.name

  const items = useWatch({
    control,
    name: name as never,
  }) as TItem[] | undefined

  const internals = getControlInternals(control)
  const length = Array.isArray(items) ? items.length : 0
  const [keysVersion, bumpKeys] = useReducer((count: number) => count + 1, 0)

  useLayoutEffect(() => {
    getControlInternals(control).getHandlers().ensureFieldArrayKeys(name, length)
    bumpKeys()
  }, [name, length, control])

  const storedKeys = internals.getHandlers().getFieldArrayKeys(name)

  const fields = useMemo((): Array<FieldArrayField<TItem>> => {
    const list = Array.isArray(items) ? items : []
    return list.map((value, index) => ({
      key: storedKeys?.[index] ?? `fa-pending-${String(name)}-${index}`,
      value,
    }))
    // keysVersion forces refresh after ensure/mutation key writes
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keysVersion tracks opaque key store
  }, [items, storedKeys, name, keysVersion])

  const readItems = useCallback((): TItem[] => {
    const current = getValueAtPath(getControlInternals(control).store.getState().values, name)
    return Array.isArray(current) ? (current as TItem[]) : []
  }, [control, name])

  const apply = useCallback(
    (
      nextItems: TItem[],
      nextKeys: string[],
      remap: IndexRemap | 'replace',
      mutationOptions?: FieldArrayMutationOptions,
    ) => {
      getControlInternals(control)
        .getHandlers()
        .applyFieldArrayChange({
          name,
          nextItems: nextItems.map((item) => cloneArrayItem(item)),
          nextKeys,
          remap,
          options: mutationOptions,
        })
    },
    [control, name],
  )

  const append = useCallback(
    (value: TItem, mutationOptions?: FieldArrayMutationOptions) => {
      const handlers = getControlInternals(control).getHandlers()
      const current = readItems()
      const currentKeys = [...handlers.ensureFieldArrayKeys(name, current.length)]
      const nextKey = handlers.allocateFieldArrayKey()
      apply([...current, value], [...currentKeys, nextKey], identityRemap(), {
        ...mutationOptions,
        focusIndex: mutationOptions?.focusIndex ?? current.length,
      })
    },
    [apply, control, name, readItems],
  )

  const prepend = useCallback(
    (value: TItem, mutationOptions?: FieldArrayMutationOptions) => {
      const handlers = getControlInternals(control).getHandlers()
      const current = readItems()
      const currentKeys = [...handlers.ensureFieldArrayKeys(name, current.length)]
      const nextKey = handlers.allocateFieldArrayKey()
      apply([value, ...current], [nextKey, ...currentKeys], insertRemap(0), {
        ...mutationOptions,
        focusIndex: mutationOptions?.focusIndex ?? 0,
      })
    },
    [apply, control, name, readItems],
  )

  const insert = useCallback(
    (index: number, value: TItem, mutationOptions?: FieldArrayMutationOptions) => {
      const handlers = getControlInternals(control).getHandlers()
      const current = readItems()
      assertInsertIndex(index, current.length)
      const currentKeys = [...handlers.ensureFieldArrayKeys(name, current.length)]
      const nextKey = handlers.allocateFieldArrayKey()
      const nextItems = [...current.slice(0, index), value, ...current.slice(index)]
      const nextKeys = [...currentKeys.slice(0, index), nextKey, ...currentKeys.slice(index)]
      apply(nextItems, nextKeys, insertRemap(index), {
        ...mutationOptions,
        focusIndex: mutationOptions?.focusIndex ?? index,
      })
    },
    [apply, control, name, readItems],
  )

  const update = useCallback(
    (index: number, value: TItem, mutationOptions?: FieldArrayMutationOptions) => {
      const handlers = getControlInternals(control).getHandlers()
      const current = readItems()
      assertArrayIndex(index, current.length, 'update')
      const currentKeys = [...handlers.ensureFieldArrayKeys(name, current.length)]
      const nextItems = current.map((item, itemIndex) => (itemIndex === index ? value : item))
      apply(nextItems, currentKeys, identityRemap(), mutationOptions)
    },
    [apply, control, name, readItems],
  )

  const remove = useCallback(
    (index: number, mutationOptions?: FieldArrayMutationOptions) => {
      const handlers = getControlInternals(control).getHandlers()
      const current = readItems()
      assertArrayIndex(index, current.length, 'remove')
      const currentKeys = [...handlers.ensureFieldArrayKeys(name, current.length)]
      apply(
        current.filter((_, itemIndex) => itemIndex !== index),
        currentKeys.filter((_, itemIndex) => itemIndex !== index),
        removeRemap(index),
        mutationOptions,
      )
    },
    [apply, control, name, readItems],
  )

  const swap = useCallback(
    (firstIndex: number, secondIndex: number, mutationOptions?: FieldArrayMutationOptions) => {
      const handlers = getControlInternals(control).getHandlers()
      const current = readItems()
      assertArrayIndex(firstIndex, current.length, 'swap')
      assertArrayIndex(secondIndex, current.length, 'swap')
      if (firstIndex === secondIndex) return

      const currentKeys = [...handlers.ensureFieldArrayKeys(name, current.length)]
      const nextItems = [...current]
      const nextKeys = [...currentKeys]
      ;[nextItems[firstIndex], nextItems[secondIndex]] = [
        nextItems[secondIndex]!,
        nextItems[firstIndex]!,
      ]
      ;[nextKeys[firstIndex], nextKeys[secondIndex]] = [nextKeys[secondIndex], nextKeys[firstIndex]]

      apply(nextItems, nextKeys, swapRemap(firstIndex, secondIndex), mutationOptions)
    },
    [apply, control, name, readItems],
  )

  const move = useCallback(
    (fromIndex: number, toIndex: number, mutationOptions?: FieldArrayMutationOptions) => {
      const handlers = getControlInternals(control).getHandlers()
      const current = readItems()
      assertArrayIndex(fromIndex, current.length, 'move')
      assertArrayIndex(toIndex, current.length, 'move')
      if (fromIndex === toIndex) return

      const currentKeys = [...handlers.ensureFieldArrayKeys(name, current.length)]
      const nextItems = [...current]
      const nextKeys = [...currentKeys]
      const [movedItem] = nextItems.splice(fromIndex, 1)
      const [movedKey] = nextKeys.splice(fromIndex, 1)
      nextItems.splice(toIndex, 0, movedItem!)
      nextKeys.splice(toIndex, 0, movedKey)

      apply(nextItems, nextKeys, moveRemap(fromIndex, toIndex), mutationOptions)
    },
    [apply, control, name, readItems],
  )

  const replace = useCallback(
    (values: TItem[], mutationOptions?: FieldArrayMutationOptions) => {
      const handlers = getControlInternals(control).getHandlers()
      const nextKeys = values.map(() => handlers.allocateFieldArrayKey())
      apply(values, nextKeys, 'replace', mutationOptions)
    },
    [apply, control],
  )

  const clear = useCallback(
    (mutationOptions?: FieldArrayMutationOptions) => {
      apply([], [], 'replace', mutationOptions)
    },
    [apply],
  )

  return useMemo(
    () => ({
      fields,
      append,
      prepend,
      insert,
      update,
      remove,
      swap,
      move,
      replace,
      clear,
    }),
    [fields, append, prepend, insert, update, remove, swap, move, replace, clear],
  )
}
