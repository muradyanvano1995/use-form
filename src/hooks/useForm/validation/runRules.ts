import type { CriteriaMode, FieldIssue } from '../errors.ts'
import { ErrorSource, fieldErrorFromIssues, issueFromInput } from '../errors.ts'
import type {
  FieldPath,
  FieldPathValue,
  FieldRules,
  FieldValidateFn,
  FieldValidators,
  FormValues,
} from '../formTypes.ts'
import { getValueAtPath } from '../pathUtilities.ts'
import {
  isDebouncedAsyncRule,
  resolveFieldDebounceMs,
  shouldDeferDebouncedRules,
  shouldSkipEmptyDebouncedValidation,
} from './asyncRule.ts'
import { getBuiltInRuleMeta } from './ruleMeta.ts'
import type { ValidationReason, ValidationRule, ValidationRuleContext } from './ruleTypes.ts'
import {
  flattenValidationResult,
  MESSAGE_SNAPSHOT,
  resolveFailureMessage,
  type MessageResolutionSnapshot,
} from './validationMessages.ts'

type TaggedRule<TValue, TValues> = {
  rule: ValidationRule<TValue, TValues>
  source: typeof ErrorSource.Rule | typeof ErrorSource.Field
}

function normalizeRules<TValue, TValues>(
  entry: ValidationRule<TValue, TValues> | readonly ValidationRule<TValue, TValues>[] | undefined,
  source: TaggedRule<TValue, TValues>['source'],
): Array<TaggedRule<TValue, TValues>> {
  if (entry == null) return []
  const list = typeof entry === 'function' ? [entry] : [...entry]
  return list.map((rule) => ({ rule, source }))
}

function normalizeValidators<T extends FormValues, K extends FieldPath<T>>(
  entry: FieldValidators<T>[K],
): Array<TaggedRule<FieldPathValue<T, K>, T>> {
  if (!entry) return []
  const list = Array.isArray(entry) ? entry : [entry]
  return list.map((validator) => ({
    source: ErrorSource.Field,
    rule: (value, values, context) => (validator as FieldValidateFn<T, K>)(value, values, context),
  }))
}

/** Combined `rules` then legacy `fieldValidators` for one path (declaration order). */
export function getCombinedFieldRules<T extends FormValues, K extends FieldPath<T>>(
  name: K,
  fieldRules: FieldRules<T> | undefined,
  fieldValidators: FieldValidators<T> | undefined,
): Array<ValidationRule<FieldPathValue<T, K>, T>> {
  return getTaggedFieldRules(name, fieldRules, fieldValidators).map((entry) => entry.rule)
}

function getTaggedFieldRules<T extends FormValues, K extends FieldPath<T>>(
  name: K,
  fieldRules: FieldRules<T> | undefined,
  fieldValidators: FieldValidators<T> | undefined,
): Array<TaggedRule<FieldPathValue<T, K>, T>> {
  return [
    ...normalizeRules(fieldRules?.[name], ErrorSource.Rule),
    ...normalizeValidators(fieldValidators?.[name]),
  ]
}

export type RunFieldRulesOptions = {
  reason?: ValidationReason
  signal?: AbortSignal
  criteriaMode?: CriteriaMode
  /**
   * `immediate` (default) — run every rule, including debounced `rules.async`.
   * `defer-debounced` — skip `rules.async` with debounce > 0 on change/dependency;
   * returns `pendingDebounceMs` so the form can schedule a later full run.
   */
  scheduleMode?: 'immediate' | 'defer-debounced'
  /** Catalog/label snapshot for this validation cycle. */
  messages?: MessageResolutionSnapshot
}

export type RunFieldRulesOutcome = {
  message: string | undefined
  issues: readonly FieldIssue[]
  /** > 0 when deferred debounced rules should be scheduled after sync passed. */
  pendingDebounceMs: number
}

function issuesFromRuleResult(
  result: unknown,
  rule: object,
  source: typeof ErrorSource.Rule | typeof ErrorSource.Field,
  name: string,
  snapshot: MessageResolutionSnapshot | undefined,
): FieldIssue[] {
  const meta = getBuiltInRuleMeta(rule)
  const issues: FieldIssue[] = []

  for (const input of flattenValidationResult(result)) {
    const rawMessage = typeof input === 'string' ? input : input.message
    const type = typeof input === 'object' ? (input.type ?? meta?.type) : meta?.type
    const params = typeof input === 'object' ? (input.params ?? meta?.params) : meta?.params
    const message = resolveFailureMessage({
      type,
      params,
      rawMessage,
      name,
      meta,
      snapshot,
    })
    const issue = issueFromInput(
      typeof input === 'string' ? message : { ...input, message, type, params },
      source,
      type,
      params,
    )
    if (issue) issues.push(issue)
  }

  return issues
}

/**
 * Runs field `rules` then legacy `fieldValidators` in order.
 * `firstError` (default) stops at the first non-empty issue.
 * `all` collects every failure in declaration order (awaited sequentially).
 */
export async function runFieldRules<T extends FormValues, K extends FieldPath<T>>(
  name: K,
  values: T,
  fieldRules: FieldRules<T> | undefined,
  fieldValidators: FieldValidators<T> | undefined,
  options?: RunFieldRulesOptions,
): Promise<string | undefined> {
  const outcome = await runFieldRulesDetailed(name, values, fieldRules, fieldValidators, options)
  return outcome.message
}

/**
 * Like {@link runFieldRules}, but reports issues and whether debounced async work should be scheduled.
 */
export async function runFieldRulesDetailed<T extends FormValues, K extends FieldPath<T>>(
  name: K,
  values: T,
  fieldRules: FieldRules<T> | undefined,
  fieldValidators: FieldValidators<T> | undefined,
  options?: RunFieldRulesOptions,
): Promise<RunFieldRulesOutcome> {
  const tagged = getTaggedFieldRules(name, fieldRules, fieldValidators)
  const combined = tagged.map((entry) => entry.rule)
  const reason = options?.reason ?? 'manual'
  const scheduleMode = options?.scheduleMode ?? 'immediate'
  const criteriaMode = options?.criteriaMode ?? 'firstError'
  const defer = scheduleMode === 'defer-debounced' && shouldDeferDebouncedRules(reason)

  let pendingDebounceMs = 0
  if (defer) {
    pendingDebounceMs = resolveFieldDebounceMs(combined)
  }

  const fieldValue = getValueAtPath(values, name) as FieldPathValue<T, K>
  const snapshot = options?.messages
  const context: ValidationRuleContext<T, string> = {
    name,
    values,
    reason,
    signal: options?.signal,
    criteriaMode,
    ...(snapshot ? { [MESSAGE_SNAPSHOT]: snapshot } : {}),
  }

  const collected: FieldIssue[] = []

  for (const entry of tagged) {
    if (defer && isDebouncedAsyncRule(entry.rule)) {
      continue
    }

    const result = await entry.rule(fieldValue, values, context)
    const issues = issuesFromRuleResult(result, entry.rule, entry.source, name, snapshot)
    if (issues.length === 0) continue

    collected.push(...issues)
    if (criteriaMode === 'firstError') {
      const error = fieldErrorFromIssues(collected)
      return { message: error?.message, issues: error?.issues ?? collected, pendingDebounceMs: 0 }
    }
  }

  if (pendingDebounceMs > 0 && shouldSkipEmptyDebouncedValidation(combined, fieldValue)) {
    return { message: undefined, issues: [], pendingDebounceMs: 0 }
  }

  const error = fieldErrorFromIssues(collected)
  return {
    message: error?.message,
    issues: error?.issues ?? [],
    pendingDebounceMs,
  }
}
