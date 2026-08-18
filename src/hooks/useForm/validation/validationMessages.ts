import type { FieldPath, FormValues } from '../baseTypes.ts'
import type { ValidationIssueInput } from '../errors.ts'
import type { ValidationRuleContext } from './ruleTypes.ts'

/** Stable public identifiers for built-in field rules. Changing these later is breaking. */
export type BuiltInRuleType =
  | 'required'
  | 'email'
  | 'minLength'
  | 'maxLength'
  | 'length'
  | 'min'
  | 'max'
  | 'pattern'
  | 'accepted'
  | 'sameAs'
  | 'matchesField'
  | 'fileSize'
  | 'fileType'
  | 'fileExtension'
  | 'minFiles'
  | 'maxFiles'
  | 'minItems'
  | 'maxItems'

export type BuiltInRuleParams = {
  required: Record<string, never>
  email: Record<string, never>
  minLength: { min: number }
  maxLength: { max: number }
  length: { length: number }
  min: { min: number }
  max: { max: number }
  pattern: { source: string; flags: string }
  accepted: Record<string, never>
  /** Expected comparison values are never copied into params. */
  sameAs: Record<string, never>
  matchesField: { field: string }
  fileSize: { maxBytes: number }
  fileType: { allowedTypes: readonly string[] }
  fileExtension: { allowedExtensions: readonly string[] }
  minFiles: { min: number }
  maxFiles: { max: number }
  minItems: { min: number }
  maxItems: { max: number }
}

export type ValidationMessageContext<
  TValues extends FormValues,
  TPath extends FieldPath<TValues> = FieldPath<TValues>,
  TParams extends Readonly<Record<string, unknown>> = Readonly<Record<string, unknown>>,
> = {
  type: string
  name: TPath
  label: string
  params: TParams
}

export type ValidationMessage<TContext> = string | ((context: TContext) => string)

export type ValidationMessageCatalog<TValues extends FormValues> = {
  [K in BuiltInRuleType]?: ValidationMessage<
    ValidationMessageContext<TValues, FieldPath<TValues>, Readonly<BuiltInRuleParams[K]>>
  >
}

export type FieldLabels<TValues extends FormValues> = Partial<Record<FieldPath<TValues>, string>>

export type RuleMessage<K extends BuiltInRuleType = BuiltInRuleType> = ValidationMessage<
  ValidationMessageContext<FormValues, string, Readonly<BuiltInRuleParams[K]>>
>

const BUILT_IN_RULE_TYPES: readonly BuiltInRuleType[] = [
  'required',
  'email',
  'minLength',
  'maxLength',
  'length',
  'min',
  'max',
  'pattern',
  'accepted',
  'sameAs',
  'matchesField',
  'fileSize',
  'fileType',
  'fileExtension',
  'minFiles',
  'maxFiles',
  'minItems',
  'maxItems',
]

const BUILT_IN_RULE_TYPE_SET = new Set<string>(BUILT_IN_RULE_TYPES)

export function isBuiltInRuleType(value: string | undefined): value is BuiltInRuleType {
  return typeof value === 'string' && BUILT_IN_RULE_TYPE_SET.has(value)
}

type DefaultCatalog = {
  [K in BuiltInRuleType]: ValidationMessage<
    ValidationMessageContext<FormValues, FieldPath<FormValues>, Readonly<BuiltInRuleParams[K]>>
  >
}

function englishCountNoun(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural
}

const defaultValidationMessagesConfig = {
  required: 'This field is required',
  email: 'Enter a valid email address',
  minLength: ({ params }) =>
    `Must be at least ${params.min} ${englishCountNoun(params.min, 'character', 'characters')}`,
  maxLength: ({ params }) =>
    `Must be at most ${params.max} ${englishCountNoun(params.max, 'character', 'characters')}`,
  length: ({ params }) =>
    `Must be exactly ${params.length} ${englishCountNoun(params.length, 'character', 'characters')}`,
  min: ({ params }) => `Must be at least ${params.min}`,
  max: ({ params }) => `Must be at most ${params.max}`,
  pattern: 'Invalid format',
  accepted: 'You must accept this',
  sameAs: 'Values must match',
  matchesField: 'Fields must match',
  fileSize: ({ params }) => `File must not exceed ${params.maxBytes} bytes`,
  fileType: 'Unsupported file type',
  fileExtension: 'Unsupported file extension',
  minFiles: ({ params }) =>
    params.min === 1 ? 'Select at least one file' : `Select at least ${params.min} files`,
  maxFiles: ({ params }) =>
    `You can upload up to ${params.max} ${englishCountNoun(params.max, 'file', 'files')}`,
  minItems: ({ params }) =>
    params.min === 1 ? 'Add at least one item' : `Add at least ${params.min} items`,
  maxItems: ({ params }) =>
    `At most ${params.max} ${englishCountNoun(params.max, 'item', 'items')} allowed`,
} as const satisfies DefaultCatalog

/** Immutable English defaults. Treat as readonly; do not mutate. */
export const defaultValidationMessages: Readonly<typeof defaultValidationMessagesConfig> =
  Object.freeze(defaultValidationMessagesConfig)

export type MessageResolutionSnapshot = {
  catalog?: ValidationMessageCatalog<FormValues>
  labels?: Partial<Record<string, string>>
}

/** Internal — not a public export. Lets combinators read the cycle snapshot. */
export const MESSAGE_SNAPSHOT: unique symbol = Symbol('form.validationMessageSnapshot')

export function captureMessageSnapshot(
  catalog?: ValidationMessageCatalog<FormValues> | object,
  labels?: FieldLabels<FormValues> | object,
): MessageResolutionSnapshot {
  return {
    catalog: catalog ? ({ ...catalog } as ValidationMessageCatalog<FormValues>) : undefined,
    labels: labels ? { ...labels } : undefined,
  }
}

export function readMessageSnapshot(
  context: ValidationRuleContext<FormValues, string> | undefined,
): MessageResolutionSnapshot | undefined {
  if (!context) return undefined
  return (context as { [MESSAGE_SNAPSHOT]?: MessageResolutionSnapshot })[MESSAGE_SNAPSHOT]
}

export function resolveFieldLabel(
  name: string,
  labels: Partial<Record<string, string>> | undefined,
): string {
  const labeled = labels?.[name]
  if (typeof labeled === 'string' && labeled.length > 0) return labeled
  return name
}

function invokeValidationMessage(
  definition: unknown,
  context: ValidationMessageContext<FormValues, string>,
): string | undefined {
  if (definition == null) return undefined
  if (typeof definition === 'string') {
    return definition.length > 0 ? definition : undefined
  }
  if (typeof definition !== 'function') return undefined
  const result = (definition as (next: ValidationMessageContext<FormValues, string>) => unknown)(
    context,
  )
  if (typeof result !== 'string' || result.length === 0) return undefined
  return result
}

export function formatDefaultValidationMessage(
  type: BuiltInRuleType,
  params: Readonly<Record<string, unknown>> = {},
): string {
  const context: ValidationMessageContext<FormValues, string> = {
    type,
    name: '',
    label: '',
    params,
  }
  return invokeValidationMessage(defaultValidationMessages[type], context) ?? ''
}

export type LocalizedRuleMeta = {
  type: string
  params?: Readonly<Record<string, unknown>>
  customMessage?: RuleMessage
  hasCustomMessage: boolean
  localize: boolean
}

export function resolveFailureMessage(args: {
  type: string | undefined
  params: Readonly<Record<string, unknown>> | undefined
  rawMessage: string
  name: string
  meta: LocalizedRuleMeta | undefined
  snapshot: MessageResolutionSnapshot | undefined
}): string {
  const type = args.type ?? args.meta?.type
  const params = args.params ?? args.meta?.params ?? {}
  const context: ValidationMessageContext<FormValues, string> = {
    type: type ?? '',
    name: args.name,
    label: resolveFieldLabel(args.name, args.snapshot?.labels),
    params,
  }

  const localize = args.meta?.localize !== false && isBuiltInRuleType(type)
  if (!localize || !type || !isBuiltInRuleType(type)) {
    return args.rawMessage
  }

  if (args.meta?.hasCustomMessage) {
    const custom = invokeValidationMessage(args.meta.customMessage, context)
    if (custom) return custom
  }

  const catalogEntry = args.snapshot?.catalog?.[type]
  const fromCatalog = invokeValidationMessage(catalogEntry, context)
  if (fromCatalog) return fromCatalog

  const fromDefault = invokeValidationMessage(defaultValidationMessages[type], context)
  if (fromDefault) return fromDefault

  return args.rawMessage
}

export function flattenValidationResult(
  result: unknown,
): Array<Exclude<ValidationIssueInput, undefined>> {
  if (result == null) return []
  if (Array.isArray(result)) {
    const items: Array<Exclude<ValidationIssueInput, undefined>> = []
    for (const item of result) {
      items.push(...flattenValidationResult(item))
    }
    return items
  }
  if (typeof result === 'string') {
    return result.length > 0 ? [result] : []
  }
  if (
    typeof result === 'object' &&
    result !== null &&
    'message' in result &&
    typeof result.message === 'string' &&
    result.message.length > 0
  ) {
    return [result as Exclude<ValidationIssueInput, undefined>]
  }
  return []
}
