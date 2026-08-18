import type { CriteriaMode, ValidationIssueInput } from '../errors.ts'

/** `undefined` means valid; a non-empty string, structured issue, or list of issues is a failure. */
export type ValidationResult =
  ValidationIssueInput | readonly Exclude<ValidationIssueInput, undefined>[]

/** Why a validation cycle started. */
export type ValidationReason = 'change' | 'blur' | 'submit' | 'manual' | 'dependency'

/**
 * Options for `rules.async` / {@link createAsyncRule}.
 *
 * - `debounce` — milliseconds to wait for change/dependency validation (default `0` = immediate).
 * - `validateEmpty` — when `false` (default), skip the remote check for empty values.
 */
export type AsyncRuleOptions = {
  debounce?: number
  validateEmpty?: boolean
  /** Stable machine-readable type for structured issues produced by this rule. */
  type?: string
}

/**
 * Third argument for field validators that opt into richer context.
 * Two-argument validators remain assignable.
 */
export type ValidationRuleContext<TValues, TName extends string = string> = {
  name: TName
  values: Readonly<TValues>
  reason: ValidationReason
  signal?: AbortSignal
  /** Present for field-rule combinators such as `eachFile`. Default `firstError`. */
  criteriaMode?: CriteriaMode
}

/**
 * Sync or async field rule.
 * Normal validation failures return a message — they must not throw.
 * Unexpected infrastructure errors may reject/throw and are not treated as field errors.
 *
 * An optional third `context` argument provides path, reason, and AbortSignal.
 * Existing two-argument validators remain assignable.
 */
export type ValidationRule<TValue, TValues> = (
  value: TValue,
  values: Readonly<TValues>,
  context?: ValidationRuleContext<TValues, string>,
) => ValidationResult | Promise<ValidationResult>

/** Identity helper for reusable typed custom rules with explicit generics. */
export function createRule<TValue, TValues>(
  validator: ValidationRule<TValue, TValues>,
): ValidationRule<TValue, TValues> {
  return validator
}
