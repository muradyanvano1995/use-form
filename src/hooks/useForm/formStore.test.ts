import { describe, expect, it, vi } from 'vitest'
import {
  createFormControl,
  createFormStore,
  getControlInternals,
  isFormControl,
  resolveFormControl,
} from './formStore.ts'
import type { FormInternalState } from './formTypes.ts'
import { renderHook } from '@testing-library/react'
import { useForm } from './useForm.ts'

type Sample = {
  email: string
  age: number
}

function sampleState(overrides?: Partial<FormInternalState<Sample>>): FormInternalState<Sample> {
  return {
    values: { email: '', age: 0 },
    defaultValues: { email: '', age: 0 },
    errors: {},
    errorDetails: {},
    touched: {},
    isSubmitting: false,
    isValidating: false,
    isLoadingDefaults: false,
    isDefaultsReady: true,
    defaultValuesError: undefined,
    isSubmitted: false,
    submitCount: 0,
    submitError: undefined,
    rootError: undefined,
    rootErrorDetails: undefined,
    ...overrides,
  }
}

describe('createFormStore', () => {
  describe('getState / setState', () => {
    it('returns a stable getServerSnapshot reference until state changes', () => {
      const initial = sampleState()
      const store = createFormStore(initial)
      expect(store.getServerSnapshot()).toBe(initial)
      expect(store.getServerSnapshot()).toBe(store.getState())

      const next = sampleState({ values: { email: 'a@b.com', age: 1 } })
      store.setState(next)
      expect(store.getServerSnapshot()).toBe(next)
      expect(store.getServerSnapshot()).toBe(store.getState())
    })

    it('keeps independent snapshots for different store instances', () => {
      const a = createFormStore(sampleState({ values: { email: 'a', age: 1 } }))
      const b = createFormStore(sampleState({ values: { email: 'b', age: 2 } }))
      expect(a.getServerSnapshot()).not.toBe(b.getServerSnapshot())
      expect(a.getState().values.email).toBe('a')
      expect(b.getState().values.email).toBe('b')
    })

    it('replaces state by value and by updater', () => {
      const store = createFormStore(sampleState())
      const next = sampleState({ values: { email: 'a@b.com', age: 1 } })
      store.setState(next)
      expect(store.getState()).toBe(next)

      store.setState((prev) => ({
        ...prev,
        values: { ...prev.values, age: 2 },
      }))
      expect(store.getState().values.age).toBe(2)
    })

    it('defers notifications until the outermost transaction ends', () => {
      const store = createFormStore(sampleState())
      const listener = vi.fn()
      store.subscribe(listener)

      store.beginTransaction()
      store.setState(sampleState({ values: { email: 'a@b.com', age: 1 } }))
      expect(listener).not.toHaveBeenCalled()
      expect(store.getState().values.email).toBe('a@b.com')
      store.beginTransaction()
      store.setState(sampleState({ values: { email: 'c@d.com', age: 2 } }))
      expect(listener).not.toHaveBeenCalled()
      store.endTransaction()
      expect(listener).not.toHaveBeenCalled()
      store.endTransaction()
      expect(listener).toHaveBeenCalledTimes(1)
      expect(store.getTransactionDepth()).toBe(0)
    })

    it('does not notify when a transaction leaves the same snapshot', () => {
      const store = createFormStore(sampleState())
      const listener = vi.fn()
      store.subscribe(listener)
      const current = store.getState()
      store.beginTransaction()
      store.setState(current)
      store.endTransaction()
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('subscribe', () => {
    it('notifies listeners and supports unsubscribe', () => {
      const store = createFormStore(sampleState())
      const listener = vi.fn()
      const unsubscribe = store.subscribe(listener)

      store.setState(sampleState({ values: { email: 'x', age: 0 } }))
      expect(listener).toHaveBeenCalledTimes(1)

      unsubscribe()
      store.setState(sampleState({ values: { email: 'y', age: 0 } }))
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('allows a listener to unsubscribe another during notification without throwing', () => {
      const store = createFormStore(sampleState())
      const second = vi.fn()
      let unsubscribeSecond = () => {}
      const first = vi.fn(() => {
        unsubscribeSecond()
      })
      store.subscribe(first)
      unsubscribeSecond = store.subscribe(second)

      expect(() => {
        store.setState(sampleState({ values: { email: 'z', age: 0 } }))
      }).not.toThrow()
      expect(first).toHaveBeenCalledTimes(1)
    })
  })
})

describe('opaque FormControl', () => {
  it('registers internals without exposing store mutation on the public object', () => {
    const store = createFormStore(sampleState())
    const control = createFormControl<Sample>({
      store,
      getFormId: () => 'form',
      getHandlers: () => ({
        setValue: () => {},
        blurField: () => {},
        connectElement: () => {},
        disconnectElement: () => {},
        retainController: () => {},
        releaseController: () => {},
        markFieldRegistered: () => {},
        applyFieldArrayChange: () => {},
        getFieldArrayKeys: () => undefined,
        ensureFieldArrayKeys: () => [],
        allocateFieldArrayKey: () => 'fa-1',
      }),
    })

    expect(isFormControl(control)).toBe(true)
    expect(Object.keys(control)).toEqual([])
    expect(Object.isFrozen(control)).toBe(true)
    expect('_store' in control).toBe(false)
    expect('_getHandlers' in control).toBe(false)

    const internals = getControlInternals(control)
    expect(internals.store).toBe(store)
    expect(internals.getFormId()).toBe('form')
  })

  it('isolates form instances through separate controls', () => {
    const { result: a } = renderHook(() =>
      useForm<Sample>({ defaultValues: { email: 'a', age: 1 } }),
    )
    const { result: b } = renderHook(() =>
      useForm<Sample>({ defaultValues: { email: 'b', age: 2 } }),
    )

    expect(a.current.control).not.toBe(b.current.control)
    expect(getControlInternals(a.current.control).store).not.toBe(
      getControlInternals(b.current.control).store,
    )
    expect(a.current.values.email).toBe('a')
    expect(b.current.values.email).toBe('b')
  })

  it('resolveFormControl accepts a control or a form-like object', () => {
    const store = createFormStore(sampleState())
    const control = createFormControl<Sample>({
      store,
      getFormId: () => 'form',
      getHandlers: () => ({
        setValue: () => {},
        blurField: () => {},
        connectElement: () => {},
        disconnectElement: () => {},
        retainController: () => {},
        releaseController: () => {},
        markFieldRegistered: () => {},
        applyFieldArrayChange: () => {},
        getFieldArrayKeys: () => undefined,
        ensureFieldArrayKeys: () => [],
        allocateFieldArrayKey: () => 'fa-1',
      }),
    })

    expect(resolveFormControl(control)).toBe(control)
    expect(resolveFormControl({ control })).toBe(control)
  })

  it('throws for unregistered objects', () => {
    expect(() => getControlInternals({} as never)).toThrow(/missing internals/)
    expect(() => resolveFormControl({} as never)).toThrow(/Invalid FormControl/)
  })
})
