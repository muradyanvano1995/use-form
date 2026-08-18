import { freezeParams } from '../errors.ts'
import type { ValidationRule } from './ruleTypes.ts'
import type { LocalizedRuleMeta, RuleMessage } from './validationMessages.ts'

export type BuiltInRuleMeta = LocalizedRuleMeta

const builtInRuleMeta = new WeakMap<object, BuiltInRuleMeta>()

export type AnnotateRuleOptions = {
  customMessage?: RuleMessage
  hasCustomMessage?: boolean
  localize?: boolean
}

/** Attach stable type/params to a built-in rule. Not a public export. */
export function annotateRule<TValue, TValues>(
  rule: ValidationRule<TValue, TValues>,
  type: string,
  params?: Readonly<Record<string, unknown>>,
  options?: AnnotateRuleOptions,
): ValidationRule<TValue, TValues> {
  builtInRuleMeta.set(rule, {
    type,
    params: freezeParams(params),
    customMessage: options?.customMessage,
    hasCustomMessage: options?.hasCustomMessage ?? false,
    localize: options?.localize ?? true,
  })
  return rule
}

export function getBuiltInRuleMeta(rule: object): BuiltInRuleMeta | undefined {
  return builtInRuleMeta.get(rule)
}
