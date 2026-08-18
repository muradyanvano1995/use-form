import { describe, expect, it, vi } from 'vitest'
import { rules } from './builtInRules.ts'
import { runFieldRules, runFieldRulesDetailed } from './runRules.ts'

describe('runFieldRules', () => {
  it('returns undefined when no rules or validators are configured', async () => {
    await expect(
      runFieldRules('email', { email: '' }, undefined, undefined),
    ).resolves.toBeUndefined()
  })

  it('supports a single rule function', async () => {
    const message = await runFieldRules(
      'email',
      { email: 'bad' },
      { email: rules.email('Bad email') },
      undefined,
    )
    expect(message).toBe('Bad email')
  })

  it('runs ordered rules and stops at the first failure', async () => {
    const second = vi.fn(() => 'second')
    const message = await runFieldRules(
      'username',
      { username: '' },
      { username: [rules.required('Required'), second] },
      undefined,
    )

    expect(message).toBe('Required')
    expect(second).not.toHaveBeenCalled()
  })

  it('treats empty rule arrays as a no-op', async () => {
    await expect(
      runFieldRules('email', { email: '' }, { email: [] }, undefined),
    ).resolves.toBeUndefined()
  })

  it('runs rules before legacy fieldValidators', async () => {
    const fieldValidator = vi.fn(() => 'validator')
    const message = await runFieldRules(
      'name',
      { name: '' },
      { name: rules.required('From rules') },
      { name: fieldValidator },
    )

    expect(message).toBe('From rules')
    expect(fieldValidator).not.toHaveBeenCalled()
  })

  it('falls through to fieldValidators when rules pass', async () => {
    const message = await runFieldRules(
      'email',
      { email: 'a@b.com' },
      { email: rules.email() },
      {
        email: () => 'From validator',
      },
    )

    expect(message).toBe('From validator')
  })

  it('does not mutate consumer rule arrays', async () => {
    const emailRules = [rules.required(), rules.email()] as const
    const snapshot = [...emailRules]

    await runFieldRules('email', { email: '' }, { email: emailRules }, undefined)

    expect(emailRules).toEqual(snapshot)
  })

  it('defers debounced rules on change and reports pendingDebounceMs', async () => {
    const remote = vi.fn(async () => 'remote')
    const outcome = await runFieldRulesDetailed(
      'username',
      { username: 'alice' },
      {
        username: [rules.required(), rules.async(remote, { debounce: 400 })],
      },
      undefined,
      { reason: 'change', scheduleMode: 'defer-debounced' },
    )

    expect(outcome.message).toBeUndefined()
    expect(outcome.pendingDebounceMs).toBe(400)
    expect(remote).not.toHaveBeenCalled()
  })

  it('does not schedule after a sync failure', async () => {
    const remote = vi.fn(async () => 'remote')
    const outcome = await runFieldRulesDetailed(
      'username',
      { username: '' },
      {
        username: [rules.required('Required'), rules.async(remote, { debounce: 400 })],
      },
      undefined,
      { reason: 'change', scheduleMode: 'defer-debounced' },
    )

    expect(outcome.message).toBe('Required')
    expect(outcome.pendingDebounceMs).toBe(0)
    expect(remote).not.toHaveBeenCalled()
  })

  describe('criteriaMode', () => {
    it('collects every sync and async failure in declaration order', async () => {
      const outcome = await runFieldRulesDetailed(
        'password',
        { password: 'short' },
        {
          password: [
            rules.minLength(12, 'Use at least 12 characters'),
            rules.pattern(/[A-Z]/, 'Add an uppercase letter'),
            async () => 'Needs a number',
          ],
        },
        undefined,
        { criteriaMode: 'all' },
      )

      expect(outcome.message).toBe('Use at least 12 characters')
      expect(outcome.issues.map((issue) => issue.message)).toEqual([
        'Use at least 12 characters',
        'Add an uppercase letter',
        'Needs a number',
      ])
      expect(outcome.issues[0]?.type).toBe('minLength')
      expect(outcome.issues[0]?.params).toEqual({ min: 12 })
    })

    it('attaches metadata from built-in rules to string results', async () => {
      const outcome = await runFieldRulesDetailed(
        'email',
        { email: 'bad' },
        { email: rules.email('Bad email') },
        undefined,
      )

      expect(outcome.issues).toEqual([
        expect.objectContaining({ message: 'Bad email', type: 'email', source: 'rule' }),
      ])
    })

    it('tags legacy fieldValidators as field source', async () => {
      const outcome = await runFieldRulesDetailed('email', { email: 'a@b.com' }, undefined, {
        email: () => 'From validator',
      })

      expect(outcome.issues[0]).toMatchObject({ message: 'From validator', source: 'field' })
    })

    it('resolves catalog messages and skips unused factories in firstError mode', async () => {
      const required = vi.fn(() => 'Need a value')
      const minLength = vi.fn(() => 'Too short')
      const outcome = await runFieldRulesDetailed(
        'password',
        { password: '' },
        { password: [rules.required(), rules.minLength(8)] },
        undefined,
        {
          messages: {
            catalog: { required, minLength },
            labels: { password: 'Password' },
          },
        },
      )

      expect(outcome.message).toBe('Need a value')
      expect(required).toHaveBeenCalledTimes(1)
      expect(minLength).not.toHaveBeenCalled()
    })

    it('resolves every applicable catalog factory in all mode', async () => {
      const minLength = vi.fn(({ params }) => `min ${params.min}`)
      const pattern = vi.fn(() => 'pattern')
      const outcome = await runFieldRulesDetailed(
        'password',
        { password: 'short' },
        {
          password: [rules.minLength(12), rules.pattern(/[A-Z]/)],
        },
        undefined,
        {
          criteriaMode: 'all',
          messages: { catalog: { minLength, pattern } },
        },
      )

      expect(outcome.issues.map((issue) => issue.message)).toEqual(['min 12', 'pattern'])
      expect(minLength).toHaveBeenCalledTimes(1)
      expect(pattern).toHaveBeenCalledTimes(1)
    })
  })
})
