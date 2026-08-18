import type {
  AsyncRuleOptions,
  ValidationReason,
  ValidationResult,
  ValidationRule,
  ValidationRuleContext,
} from './ruleTypes.ts'
import { annotateRule } from './ruleMeta.ts'
import { isEmptyValue } from './utilities.ts'

export type { AsyncRuleOptions, ValidationReason, ValidationRuleContext }

export type AsyncValidator<TValue, TValues, TName extends string = string> = (
  value: TValue,
  values: Readonly<TValues>,
  context: ValidationRuleContext<TValues, TName>,
) => ValidationResult | Promise<ValidationResult>

type AsyncRuleMeta = {
  debounce: number
  validateEmpty: boolean
  type?: string
}

const asyncRuleMeta = new WeakMap<object, AsyncRuleMeta>()

/** Internal: read debounce metadata attached by `rules.async`. */
export function getAsyncRuleMeta(rule: object): AsyncRuleMeta | undefined {
  return asyncRuleMeta.get(rule)
}

/** True when the rule was created with `rules.async` and `debounce > 0`. */
export function isDebouncedAsyncRule(rule: unknown): boolean {
  if (typeof rule !== 'function') return false
  const meta = asyncRuleMeta.get(rule)
  return meta !== undefined && meta.debounce > 0
}

/**
 * Normalize debounce milliseconds.
 * Invalid values (negative, `NaN`, `Infinity`, non-numbers) throw a configuration error.
 */
export function normalizeDebounceMs(value: number | undefined): number {
  const debounce = value ?? 0
  if (typeof debounce !== 'number' || !Number.isFinite(debounce) || debounce < 0) {
    throw new Error(`rules.async: debounce must be a finite number ≥ 0 (received ${String(value)})`)
  }
  return debounce
}

/**
 * Marks a validator as an explicit async rule with optional debounce metadata.
 *
 * Ordinary `async (value) => …` validators are **not** debounced — only rules created
 * through this helper (or `rules.async`) carry scheduling metadata.
 *
 * Metadata is stored in a private WeakMap (not enumerable on form values/state).
 */
export function createAsyncRule<TValue, TValues, TName extends string = string>(
  validator: AsyncValidator<TValue, TValues, TName>,
  options?: AsyncRuleOptions,
): ValidationRule<TValue, TValues> {
  const debounce = normalizeDebounceMs(options?.debounce)
  const validateEmpty = options?.validateEmpty ?? false
  const type =
    typeof options?.type === 'string' && options.type.length > 0 ? options.type : undefined

  const rule: ValidationRule<TValue, TValues> = async (value, values, context) => {
    if (!validateEmpty && isEmptyValue(value)) {
      return undefined
    }

    const resolved: ValidationRuleContext<TValues, TName> = context
      ? (context as ValidationRuleContext<TValues, TName>)
      : {
          name: '' as TName,
          values,
          reason: 'manual',
        }

    return validator(value, values, resolved)
  }

  asyncRuleMeta.set(rule, { debounce, validateEmpty, type })
  return type ? annotateRule(rule, type, undefined, { localize: false }) : rule
}

/**
 * Single field-level debounce delay for a rule list.
 * Multiple debounced rules on one field must share the same delay; conflicting
 * durations throw a configuration error. Returns `0` when nothing is debounced.
 */
export function resolveFieldDebounceMs(rules: ReadonlyArray<unknown>): number {
  const delays = new Set<number>()
  for (const rule of rules) {
    if (typeof rule !== 'function') continue
    const meta = asyncRuleMeta.get(rule)
    if (meta && meta.debounce > 0) {
      delays.add(meta.debounce)
    }
  }
  if (delays.size === 0) return 0
  if (delays.size > 1) {
    throw new Error(
      `Conflicting debounce durations on the same field: ${[...delays].join(', ')}ms. Use one delay for all rules.async entries on a field.`,
    )
  }
  return [...delays][0]!
}

/** Change and dependency cycles may defer `rules.async` with debounce > 0. */
export function shouldDeferDebouncedRules(reason: ValidationReason): boolean {
  return reason === 'change' || reason === 'dependency'
}

/**
 * When every debounced rule opts out of empty validation and the value is empty,
 * skip scheduling a remote check (and clear stale remote errors).
 */
export function shouldSkipEmptyDebouncedValidation(
  rules: ReadonlyArray<unknown>,
  value: unknown,
): boolean {
  if (!isEmptyValue(value)) return false
  const debounced = rules.filter(isDebouncedAsyncRule)
  if (debounced.length === 0) return false
  return debounced.every((rule) => getAsyncRuleMeta(rule as object)?.validateEmpty === false)
}
