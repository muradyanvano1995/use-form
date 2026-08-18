import { describe, expect, it } from 'vitest'
import {
  CriteriaMode,
  detailsFromSetErrorsInput,
  detailsFromStringMap,
  ErrorSource,
  fieldErrorFromIssues,
  freezeParams,
  issueFromInput,
  mergeFieldErrorDetails,
  omitFieldErrorDetail,
  omitFieldErrorDetailsUnder,
  setFieldErrorDetail,
  stripServerIssues,
  stripServerIssuesUnder,
  stripValidationIssueAtPath,
  syncErrorViews,
  toFieldErrors,
} from './errors.ts'

describe('errors', () => {
  describe('fieldErrorFromIssues', () => {
    it('builds a frozen error whose primary fields match issues[0]', () => {
      const error = fieldErrorFromIssues([
        { message: 'Required', type: 'required', source: ErrorSource.Rule },
        { message: 'Too short', type: 'minLength', source: ErrorSource.Rule, params: { min: 8 } },
      ])

      expect(error?.message).toBe('Required')
      expect(error?.type).toBe('required')
      expect(error?.source).toBe('rule')
      expect(error?.issues).toHaveLength(2)
      expect(error?.issues[0]).toMatchObject({ message: 'Required', type: 'required' })
      expect(Object.isFrozen(error)).toBe(true)
      expect(Object.isFrozen(error?.issues)).toBe(true)
    })

    it('rejects empty issue lists and empty messages', () => {
      expect(fieldErrorFromIssues([])).toBeUndefined()
      expect(fieldErrorFromIssues([{ message: '', source: ErrorSource.Rule }])).toBeUndefined()
    })

    it('deduplicates exact identical issues', () => {
      const error = fieldErrorFromIssues([
        { message: 'Required', type: 'required', source: ErrorSource.Rule },
        { message: 'Required', type: 'required', source: ErrorSource.Rule },
        { message: 'Required', type: 'minLength', source: ErrorSource.Rule },
      ])

      expect(error?.issues).toHaveLength(2)
      expect(error?.issues[1]?.type).toBe('minLength')
    })

    it('does not treat the same type and message with different params as duplicates', () => {
      const error = fieldErrorFromIssues([
        {
          message: 'Value is too small',
          type: 'minimum',
          source: ErrorSource.Rule,
          params: { min: 5 },
        },
        {
          message: 'Value is too small',
          type: 'minimum',
          source: ErrorSource.Rule,
          params: { min: 10 },
        },
      ])

      expect(error?.issues).toHaveLength(2)
      expect(error?.issues[0]?.params).toEqual({ min: 5 })
      expect(error?.issues[1]?.params).toEqual({ min: 10 })
    })

    it('deduplicates issues whose public semantic fields including params match', () => {
      const error = fieldErrorFromIssues([
        {
          message: 'Value is too small',
          type: 'minimum',
          source: ErrorSource.Rule,
          params: { min: 5, nested: { a: 1 } },
        },
        {
          message: 'Value is too small',
          type: 'minimum',
          source: ErrorSource.Rule,
          params: { nested: { a: 1 }, min: 5 },
        },
      ])

      expect(error?.issues).toHaveLength(1)
    })
  })

  describe('issueFromInput', () => {
    it('accepts strings and structured objects', () => {
      expect(issueFromInput('Required', ErrorSource.Rule, 'required')).toMatchObject({
        message: 'Required',
        type: 'required',
        source: 'rule',
      })
      expect(
        issueFromInput(
          { message: 'Too short', type: 'minLength', params: { min: 8 } },
          ErrorSource.Rule,
        ),
      ).toMatchObject({
        message: 'Too short',
        type: 'minLength',
        source: 'rule',
        params: { min: 8 },
      })
    })

    it('rejects missing or empty messages and invalid objects', () => {
      expect(issueFromInput(undefined, ErrorSource.Rule)).toBeUndefined()
      expect(issueFromInput('', ErrorSource.Rule)).toBeUndefined()
      expect(issueFromInput({ message: '' }, ErrorSource.Rule)).toBeUndefined()
      expect(issueFromInput(12 as never, ErrorSource.Rule)).toBeUndefined()
    })

    it('does not let a rule object set source', () => {
      const issue = issueFromInput(
        { message: 'Taken', type: 'unique', source: 'server' } as never,
        ErrorSource.Rule,
      )
      expect(issue?.source).toBe('rule')
    })
  })

  describe('freezeParams', () => {
    it('clones and freezes params without prototype keys', () => {
      const params = freezeParams({
        min: 8,
        __proto__: 'nope',
        constructor: 'nope',
        flags: ['i'],
      })
      expect(params).toEqual({ min: 8, flags: ['i'] })
      expect(Object.isFrozen(params)).toBe(true)
      expect(Object.isFrozen(params?.flags)).toBe(true)
    })

    it('deep-freezes nested plain objects and arrays after cloning', () => {
      const original = { min: 5, nested: { a: 1 }, list: [{ b: 2 }] }
      const frozen = freezeParams(original)

      expect(Object.isFrozen(original)).toBe(false)
      expect(Object.isFrozen(original.nested)).toBe(false)
      expect(Object.isFrozen(original.list)).toBe(false)
      expect(Object.isFrozen(frozen)).toBe(true)
      expect(Object.isFrozen(frozen?.nested)).toBe(true)
      expect(Object.isFrozen(frozen?.list)).toBe(true)
      expect(Object.isFrozen((frozen?.list as Array<{ b: number }>)[0])).toBe(true)

      original.nested.a = 9
      expect((frozen?.nested as { a: number }).a).toBe(1)
    })

    it('does not freeze host objects such as File or Date', () => {
      const file = new File(['x'], 'secret.txt')
      const date = new Date('2020-01-01T00:00:00.000Z')
      const frozen = freezeParams({ file, date, fn: () => 1 })

      expect(frozen?.file).toBe(file)
      expect(frozen?.date).toBe(date)
      expect(Object.isFrozen(file)).toBe(false)
      expect(Object.isFrozen(date)).toBe(false)
      expect(typeof frozen?.fn).toBe('function')
    })

    it('clones cyclic params without freezing the consumer object', () => {
      const params: Record<string, unknown> = { min: 2 }
      params.self = params
      const frozen = freezeParams(params) as Record<string, unknown>

      expect(frozen).not.toBe(params)
      expect(Object.isFrozen(params)).toBe(false)
      expect(params.self).toBe(params)
      expect(frozen.self).toBe(frozen)
      expect(Object.isFrozen(frozen)).toBe(true)
      expect(frozen.min).toBe(2)
    })

    it('treats distinct File references as different params identities', () => {
      const first = new File(['a'], 'avatar.png')
      const second = new File(['a'], 'avatar.png')
      const duplicated = fieldErrorFromIssues([
        {
          message: 'Too large',
          source: ErrorSource.Rule,
          type: 'fileSize',
          params: { file: first },
        },
        {
          message: 'Too large',
          source: ErrorSource.Rule,
          type: 'fileSize',
          params: { file: second },
        },
      ])
      const sameRef = fieldErrorFromIssues([
        {
          message: 'Too large',
          source: ErrorSource.Rule,
          type: 'fileSize',
          params: { file: first },
        },
        {
          message: 'Too large',
          source: ErrorSource.Rule,
          type: 'fileSize',
          params: { file: first },
        },
      ])

      expect(duplicated?.issues).toHaveLength(2)
      expect(sameRef?.issues).toHaveLength(1)
    })
  })

  describe('syncErrorViews', () => {
    it('derives string errors from canonical details', () => {
      const details = detailsFromStringMap({ email: 'Required', age: '' }, ErrorSource.Rule)
      const views = syncErrorViews(
        details,
        fieldErrorFromIssues([{ message: 'Root', source: ErrorSource.Resolver }]),
      )

      expect(views.errors).toEqual({ email: 'Required' })
      expect(views.errorDetails.email?.message).toBe('Required')
      expect(views.rootError).toBe('Root')
      expect(views.rootErrorDetails?.message).toBe('Root')
    })
  })

  describe('path maps', () => {
    it('sets, omits, and strips descendant details', () => {
      const email = fieldErrorFromIssues([{ message: 'Bad email', source: ErrorSource.Rule }])!
      const city = fieldErrorFromIssues([{ message: 'Bad city', source: ErrorSource.Form }])!
      const start = setFieldErrorDetail({}, 'email', email)
      const withCity = setFieldErrorDetail(start, 'address.city', city)

      expect(toFieldErrors(withCity)).toEqual({ email: 'Bad email', 'address.city': 'Bad city' })
      expect(omitFieldErrorDetail(withCity, 'email').email).toBeUndefined()
      expect(omitFieldErrorDetailsUnder(withCity, 'address')).toEqual({ email })
    })

    it('drops unsafe paths when mapping string and structured inputs', () => {
      const fromStrings = detailsFromStringMap(
        { email: 'Required', '__proto__.x': 'nope' } as never,
        ErrorSource.Manual,
      )
      expect(fromStrings.email?.message).toBe('Required')
      expect(Object.prototype.hasOwnProperty.call(fromStrings, '__proto__.x')).toBe(false)

      const fromSet = detailsFromSetErrorsInput(
        {
          'products.0.name': { message: 'Required', type: 'required' },
          constructor: 'nope',
        } as never,
        { source: 'server', type: 'unique' },
      )
      expect(fromSet['products.0.name']?.source).toBe('server')
      expect(fromSet['products.0.name']?.type).toBe('required')
    })
  })

  describe('merge and strip', () => {
    it('lets later maps override the same path', () => {
      const rules = detailsFromStringMap({ email: 'From rule' }, ErrorSource.Rule)
      const form = detailsFromStringMap({ email: 'From form' }, ErrorSource.Form)
      const merged = mergeFieldErrorDetails(rules, form)
      expect(merged.email?.message).toBe('From form')
      expect(merged.email?.source).toBe('form')
    })

    it('keeps manual issues while clearing validation sources on debounce wait', () => {
      const error = fieldErrorFromIssues([
        { message: 'Required', source: ErrorSource.Rule, type: 'required' },
        { message: 'Taken', source: ErrorSource.Manual, type: 'unique' },
      ])!
      const next = stripValidationIssueAtPath({ email: error }, 'email')
      expect(next.email?.message).toBe('Taken')
      expect(next.email?.source).toBe('manual')
      expect(next.email?.issues).toHaveLength(1)
    })

    it('clears server issues on value change while keeping manual issues', () => {
      const mixed = fieldErrorFromIssues([
        { message: 'Fix this', source: ErrorSource.Manual },
        { message: 'Already exists', source: ErrorSource.Server, type: 'unique' },
      ])!
      expect(stripServerIssues(mixed)?.source).toBe('manual')
      expect(
        stripServerIssuesUnder({ email: mixed, age: mixed }, 'email').email?.issues,
      ).toHaveLength(1)
      expect(
        stripServerIssuesUnder({ email: mixed, age: mixed }, 'email').age?.issues,
      ).toHaveLength(2)
    })
  })

  describe('constants', () => {
    it('exposes criteria mode and source literals', () => {
      expect(CriteriaMode.FirstError).toBe('firstError')
      expect(CriteriaMode.All).toBe('all')
      expect(ErrorSource.Server).toBe('server')
    })
  })
})
