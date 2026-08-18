import type { FieldPath, FieldPathValue, FormValues } from '../baseTypes.ts'
import type { ValidationIssueInput } from '../errors.ts'
import { getFileExtension, normalizeExtension, normalizeToFiles } from '../fileHelpers.ts'
import { getValueAtPath } from '../pathUtilities.ts'
import { createAsyncRule, type AsyncRuleOptions, type AsyncValidator } from './asyncRule.ts'
import { annotateRule, getBuiltInRuleMeta, type AnnotateRuleOptions } from './ruleMeta.ts'
import type { ValidationResult, ValidationRule, ValidationRuleContext } from './ruleTypes.ts'
import { EMAIL_PATTERN, isEmptyValue, testPattern } from './utilities.ts'
import {
  flattenValidationResult,
  formatDefaultValidationMessage,
  readMessageSnapshot,
  resolveFailureMessage,
  type BuiltInRuleParams,
  type BuiltInRuleType,
  type RuleMessage,
} from './validationMessages.ts'

type AnyValues = FormValues

function skipIfEmpty<TValue, TValues>(
  rule: ValidationRule<TValue, TValues>,
): ValidationRule<TValue, TValues> {
  return async (value, values, context) => {
    if (isEmptyValue(value)) return undefined
    return rule(value, values, context)
  }
}

function isFailure(result: ValidationResult): boolean {
  return flattenValidationResult(result).length > 0
}

function messageOptions(message?: unknown): AnnotateRuleOptions {
  return {
    customMessage: message as RuleMessage | undefined,
    hasCustomMessage: message !== undefined,
    localize: true,
  }
}

function failMessage<K extends BuiltInRuleType>(
  type: K,
  params: BuiltInRuleParams[K],
  message?: RuleMessage<K>,
): string {
  if (typeof message === 'string') return message
  return formatDefaultValidationMessage(type, params)
}

function withFileIndex(
  input: Exclude<ValidationIssueInput, undefined>,
  fileIndex: number,
  innerRule: object,
): {
  message: string
  type?: string
  params?: Readonly<Record<string, unknown>>
} {
  const meta = getBuiltInRuleMeta(innerRule)
  if (typeof input === 'string') {
    return {
      message: input,
      type: meta?.type,
      params: { ...meta?.params, fileIndex },
    }
  }
  return {
    message: input.message,
    type: input.type ?? meta?.type,
    params: { ...meta?.params, ...input.params, fileIndex },
  }
}

function localizeWrappedIssue(
  wrapped: {
    message: string
    type?: string
    params?: Readonly<Record<string, unknown>>
  },
  innerRule: object,
  context: ValidationRuleContext<FormValues, string> | undefined,
): {
  message: string
  type?: string
  params?: Readonly<Record<string, unknown>>
} {
  const message = resolveFailureMessage({
    type: wrapped.type,
    params: wrapped.params,
    rawMessage: wrapped.message,
    name: context?.name ?? '',
    meta: getBuiltInRuleMeta(innerRule),
    snapshot: readMessageSnapshot(context),
  })
  return { ...wrapped, message }
}

/**
 * Built-in, composable field validation rules.
 * Non-required rules skip empty values so optional fields stay optional.
 * Default English messages live in `defaultValidationMessages`.
 */
export const rules = {
  required: <TValue = unknown, TValues = AnyValues>(
    message?: RuleMessage<'required'>,
  ): ValidationRule<TValue, TValues> =>
    annotateRule(
      (value) => (isEmptyValue(value) ? failMessage('required', {}, message) : undefined),
      'required',
      undefined,
      messageOptions(message),
    ),

  email: <TValues = AnyValues>(message?: RuleMessage<'email'>): ValidationRule<string, TValues> =>
    annotateRule(
      skipIfEmpty((value) =>
        EMAIL_PATTERN.test(value) ? undefined : failMessage('email', {}, message),
      ),
      'email',
      undefined,
      messageOptions(message),
    ),

  minLength: <TValues = AnyValues>(
    length: number,
    message?: RuleMessage<'minLength'>,
  ): ValidationRule<string, TValues> => {
    const params = { min: length }
    return annotateRule(
      skipIfEmpty((value) =>
        value.length >= length ? undefined : failMessage('minLength', params, message),
      ),
      'minLength',
      params,
      messageOptions(message),
    )
  },

  maxLength: <TValues = AnyValues>(
    length: number,
    message?: RuleMessage<'maxLength'>,
  ): ValidationRule<string, TValues> => {
    const params = { max: length }
    return annotateRule(
      skipIfEmpty((value) =>
        value.length <= length ? undefined : failMessage('maxLength', params, message),
      ),
      'maxLength',
      params,
      messageOptions(message),
    )
  },

  length: <TValues = AnyValues>(
    exact: number,
    message?: RuleMessage<'length'>,
  ): ValidationRule<string, TValues> => {
    const params = { length: exact }
    return annotateRule(
      skipIfEmpty((value) =>
        value.length === exact ? undefined : failMessage('length', params, message),
      ),
      'length',
      params,
      messageOptions(message),
    )
  },

  min: <TValues = AnyValues>(
    minimum: number,
    message?: RuleMessage<'min'>,
  ): ValidationRule<number, TValues> => {
    const params = { min: minimum }
    return annotateRule(
      skipIfEmpty((value) =>
        typeof value === 'number' && Number.isFinite(value) && value >= minimum
          ? undefined
          : failMessage('min', params, message),
      ),
      'min',
      params,
      messageOptions(message),
    )
  },

  max: <TValues = AnyValues>(
    maximum: number,
    message?: RuleMessage<'max'>,
  ): ValidationRule<number, TValues> => {
    const params = { max: maximum }
    return annotateRule(
      skipIfEmpty((value) =>
        typeof value === 'number' && Number.isFinite(value) && value <= maximum
          ? undefined
          : failMessage('max', params, message),
      ),
      'max',
      params,
      messageOptions(message),
    )
  },

  pattern: <TValues = AnyValues>(
    pattern: RegExp,
    message?: RuleMessage<'pattern'>,
  ): ValidationRule<string, TValues> => {
    const params = { source: pattern.source, flags: pattern.flags }
    return annotateRule(
      skipIfEmpty((value) =>
        testPattern(pattern, value) ? undefined : failMessage('pattern', params, message),
      ),
      'pattern',
      params,
      messageOptions(message),
    )
  },

  accepted: <TValues = AnyValues>(
    message?: RuleMessage<'accepted'>,
  ): ValidationRule<boolean, TValues> =>
    annotateRule(
      (value) => (value ? undefined : failMessage('accepted', {}, message)),
      'accepted',
      undefined,
      messageOptions(message),
    ),

  sameAs: <TValue, TValues = AnyValues>(
    expected: TValue,
    message?: RuleMessage<'sameAs'>,
  ): ValidationRule<TValue, TValues> =>
    annotateRule(
      skipIfEmpty((value) =>
        Object.is(value, expected) ? undefined : failMessage('sameAs', {}, message),
      ),
      'sameAs',
      undefined,
      messageOptions(message),
    ),

  matchesField: <TValues extends FormValues, K extends FieldPath<TValues>>(
    fieldName: K,
    message?: RuleMessage<'matchesField'>,
  ): ValidationRule<FieldPathValue<TValues, K>, TValues> => {
    const params = { field: fieldName }
    return annotateRule(
      skipIfEmpty((value, values) =>
        Object.is(value, getValueAtPath(values, fieldName))
          ? undefined
          : failMessage('matchesField', params, message),
      ),
      'matchesField',
      params,
      messageOptions(message),
    )
  },

  /**
   * Explicit async field rule with optional debounce metadata.
   * Ordinary `async` validators without this helper still run immediately.
   *
   * @see docs/async-validation.md
   */
  async: <TValue, TValues = AnyValues, TName extends string = string>(
    validator: AsyncValidator<TValue, TValues, TName>,
    options?: AsyncRuleOptions,
  ): ValidationRule<TValue, TValues> => createAsyncRule(validator, options),

  fileSize: <TValues = AnyValues>(
    maxBytes: number,
    message?: RuleMessage<'fileSize'>,
  ): ValidationRule<File | null | File[], TValues> => {
    const params = { maxBytes }
    return annotateRule(
      skipIfEmpty((value) => {
        const files = normalizeToFiles(value)
        return files.some((file) => file.size > maxBytes)
          ? failMessage('fileSize', params, message)
          : undefined
      }),
      'fileSize',
      params,
      messageOptions(message),
    )
  },

  fileType: <TValues = AnyValues>(
    allowedTypes: readonly string[],
    message?: RuleMessage<'fileType'>,
  ): ValidationRule<File | null | File[], TValues> => {
    const params = { allowedTypes: [...allowedTypes] }
    return annotateRule(
      skipIfEmpty((value) => {
        const allowed = new Set(allowedTypes.map((type) => type.toLowerCase()))
        const files = normalizeToFiles(value)
        return files.every((file) => file.type && allowed.has(file.type.toLowerCase()))
          ? undefined
          : failMessage('fileType', params, message)
      }),
      'fileType',
      params,
      messageOptions(message),
    )
  },

  fileExtension: <TValues = AnyValues>(
    allowedExtensions: readonly string[],
    message?: RuleMessage<'fileExtension'>,
  ): ValidationRule<File | null | File[], TValues> => {
    const params = { allowedExtensions: [...allowedExtensions] }
    return annotateRule(
      skipIfEmpty((value) => {
        const allowed = new Set(allowedExtensions.map(normalizeExtension))
        const files = normalizeToFiles(value)
        return files.every((file) => {
          const extension = getFileExtension(file.name)
          return extension.length > 0 && allowed.has(extension)
        })
          ? undefined
          : failMessage('fileExtension', params, message)
      }),
      'fileExtension',
      params,
      messageOptions(message),
    )
  },

  maxFiles: <TValues = AnyValues>(
    maximum: number,
    message?: RuleMessage<'maxFiles'>,
  ): ValidationRule<File[], TValues> => {
    const params = { max: maximum }
    return annotateRule(
      skipIfEmpty((value) =>
        normalizeToFiles(value).length <= maximum
          ? undefined
          : failMessage('maxFiles', params, message),
      ),
      'maxFiles',
      params,
      messageOptions(message),
    )
  },

  minFiles: <TValues = AnyValues>(
    minimum: number,
    message?: RuleMessage<'minFiles'>,
  ): ValidationRule<File[], TValues> => {
    const params = { min: minimum }
    return annotateRule(
      (value) =>
        normalizeToFiles(value).length >= minimum
          ? undefined
          : failMessage('minFiles', params, message),
      'minFiles',
      params,
      messageOptions(message),
    )
  },

  minItems: <TItem = unknown, TValues = AnyValues>(
    minimum: number,
    message?: RuleMessage<'minItems'>,
  ): ValidationRule<readonly TItem[], TValues> => {
    const params = { min: minimum }
    return annotateRule(
      (value) =>
        Array.isArray(value) && value.length >= minimum
          ? undefined
          : failMessage('minItems', params, message),
      'minItems',
      params,
      messageOptions(message),
    )
  },

  maxItems: <TItem = unknown, TValues = AnyValues>(
    maximum: number,
    message?: RuleMessage<'maxItems'>,
  ): ValidationRule<readonly TItem[], TValues> => {
    const params = { max: maximum }
    return annotateRule(
      skipIfEmpty((value) =>
        Array.isArray(value) && value.length <= maximum
          ? undefined
          : failMessage('maxItems', params, message),
      ),
      'maxItems',
      params,
      messageOptions(message),
    )
  },

  eachFile: <TValues = AnyValues>(
    rule: ValidationRule<File, TValues>,
  ): ValidationRule<File | null | File[], TValues> =>
    annotateRule(
      skipIfEmpty(async (value, values, context) => {
        const files = normalizeToFiles(value)
        const mode = context?.criteriaMode ?? 'firstError'
        const collected: Array<{
          message: string
          type?: string
          params?: Readonly<Record<string, unknown>>
        }> = []

        for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
          const innerResult = await rule(files[fileIndex]!, values, context)
          if (!isFailure(innerResult)) continue

          const parts = flattenValidationResult(innerResult)
          for (const part of parts) {
            collected.push(
              localizeWrappedIssue(withFileIndex(part, fileIndex, rule), rule, context),
            )
          }

          if (mode === 'firstError') {
            return context ? collected[0] : innerResult
          }
        }

        if (collected.length === 0) return undefined
        if (mode === 'all') return collected
        return collected[0]
      }),
      'eachFile',
      undefined,
      { localize: false },
    ),

  custom: <TValue, TValues = AnyValues>(
    validator: ValidationRule<TValue, TValues>,
  ): ValidationRule<TValue, TValues> => validator,
} as const
