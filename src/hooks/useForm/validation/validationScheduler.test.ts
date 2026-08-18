import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFieldValidationScheduler } from './validationScheduler.ts'

describe('createFieldValidationScheduler', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('runs independent timers per path', () => {
    vi.useFakeTimers()
    const scheduler = createFieldValidationScheduler()
    const username = vi.fn()
    const email = vi.fn()

    scheduler.schedule('username', 400, username)
    scheduler.schedule('email', 600, email)

    vi.advanceTimersByTime(400)
    expect(username).toHaveBeenCalledOnce()
    expect(email).not.toHaveBeenCalled()

    vi.advanceTimersByTime(200)
    expect(email).toHaveBeenCalledOnce()
    scheduler.dispose()
  })

  it('cancels and reschedules the same path', () => {
    vi.useFakeTimers()
    const scheduler = createFieldValidationScheduler()
    const first = vi.fn()
    const second = vi.fn()

    scheduler.schedule('username', 400, first)
    scheduler.schedule('username', 400, second)

    vi.advanceTimersByTime(400)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()
    scheduler.dispose()
  })

  it('cancelAll and cancelWhere clear pending work', () => {
    vi.useFakeTimers()
    const scheduler = createFieldValidationScheduler()
    const a = vi.fn()
    const b = vi.fn()
    const c = vi.fn()

    scheduler.schedule('products.0.code', 100, a)
    scheduler.schedule('products.1.code', 100, b)
    scheduler.schedule('email', 100, c)

    scheduler.cancelWhere((path) => path.startsWith('products.'))
    expect(scheduler.hasPending('products.0.code')).toBe(false)
    expect(scheduler.hasPending('email')).toBe(true)

    scheduler.cancelAll()
    expect(scheduler.hasPending('email')).toBe(false)

    vi.advanceTimersByTime(100)
    expect(a).not.toHaveBeenCalled()
    expect(b).not.toHaveBeenCalled()
    expect(c).not.toHaveBeenCalled()
    scheduler.dispose()
  })

  it('isolates two scheduler instances', () => {
    vi.useFakeTimers()
    const one = createFieldValidationScheduler()
    const two = createFieldValidationScheduler()
    const fromOne = vi.fn()
    const fromTwo = vi.fn()

    one.schedule('username', 50, fromOne)
    two.schedule('username', 50, fromTwo)
    one.cancel('username')

    vi.advanceTimersByTime(50)
    expect(fromOne).not.toHaveBeenCalled()
    expect(fromTwo).toHaveBeenCalledOnce()
    one.dispose()
    two.dispose()
  })
})
