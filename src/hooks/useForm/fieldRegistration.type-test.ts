/**
 * Compile-time type tests for unregister / optional field paths.
 * Checked by `tsc` / `npm run typecheck` (not executed by Vitest).
 */
import {
  useForm,
  type FieldPath,
  type OptionalFieldPath,
  type UnregisterOptions,
  type UseFormOptions,
  type UseFormReturn,
} from './index.ts'
import { useController } from './useController.ts'
// @ts-expect-error — deferred unregister scheduler is internal
import { createDeferredUnregisterScheduler as _scheduler } from './index.ts'
void _scheduler

type ConditionalFormValues = {
  accountType: 'personal' | 'company'
  company?: {
    name: string
    taxNumber: string
    note?: string
  }
  nickname?: string
  address: {
    city: string
    unit?: string
  }
  tags: string[]
  optionalTags?: string[]
  extras: Array<{ note?: string; label: string }>
}

type _Optional = OptionalFieldPath<ConditionalFormValues>
const _company: _Optional = 'company'
const _companyNote: _Optional = 'company.note'
const _nickname: _Optional = 'nickname'
const _unit: _Optional = 'address.unit'
const _extraNote: _Optional = 'extras.0.note'
void _company
void _companyNote
void _nickname
void _unit
void _extraNote

// @ts-expect-error — required nested child is not optional merely because the parent is
const _companyName: _Optional = 'company.name'
void _companyName

// @ts-expect-error — required nested child of an optional parent is not optional
const _companyTax: _Optional = 'company.taxNumber'
void _companyTax

// @ts-expect-error — required top-level field is not optional
const _accountType: _Optional = 'accountType'
void _accountType

// @ts-expect-error — required nested city is not optional
const _city: _Optional = 'address.city'
void _city

// @ts-expect-error — required array item label is not optional
const _extraLabel: _Optional = 'extras.0.label'
void _extraLabel

// @ts-expect-error — required index of an optional array is not independently removable
const _optionalTagIndex: _Optional = 'optionalTags.0'
void _optionalTagIndex

const defaults: ConditionalFormValues = {
  accountType: 'personal',
  address: { city: '' },
  tags: [],
  extras: [],
}

const _options: UseFormOptions<ConditionalFormValues> = {
  defaultValues: defaults,
  shouldUnregister: true,
}

function unregisterTypeChecks(form: UseFormReturn<ConditionalFormValues>) {
  form.unregister('nickname')
  form.unregister('company')
  form.unregister('company.note', { keepValue: false })
  form.unregister('address.unit', { keepValue: false })
  form.unregister(['company', 'nickname'], { keepValue: false })
  form.unregister('address.city')
  form.unregister('extras.0.note')
  form.register('company', { shouldUnregister: true })
  form.register('company.note', { shouldUnregister: true })
  form.register('accountType', { shouldUnregister: false })

  // @ts-expect-error — invalid path
  form.unregister('missing')

  // @ts-expect-error — unsafe / nonexistent nested path
  form.unregister('address.unknown')

  // @ts-expect-error — required path cannot opt into destructive removal
  form.unregister('accountType', { keepValue: false })

  // @ts-expect-error — required nested path cannot opt into destructive removal
  form.unregister('address.city', { keepValue: false })

  // @ts-expect-error — required child under optional parent cannot be removed
  form.unregister('company.taxNumber', { keepValue: false })

  // @ts-expect-error — required nested child cannot opt into automatic unregister
  form.register('company.taxNumber', { shouldUnregister: true })

  const _keep: UnregisterOptions = { keepValue: true, keepError: false }
  void _keep
}

function existingInferenceRemains() {
  const form = useForm<ConditionalFormValues, ConditionalFormValues, { token: string }>({
    defaultValues: defaults,
    resolverContext: { token: 't' },
    loadDefaultValues: async () => defaults,
  })
  const _values: ConditionalFormValues = form.values
  const _path: FieldPath<ConditionalFormValues> = 'company.taxNumber'
  void _values
  void _path
  void form.reloadDefaultValues()
}

function controllerShouldUnregister(form: UseFormReturn<ConditionalFormValues>) {
  useController({
    control: form.control,
    name: 'nickname',
    shouldUnregister: true,
  })

  useController({
    control: form.control,
    name: 'company.taxNumber',
    // @ts-expect-error — required nested child cannot destructively unregister
    shouldUnregister: true,
  })
}

function radioIdOptionIsTyped(form: UseFormReturn<ConditionalFormValues>) {
  form.register('accountType', {
    type: 'radio',
    value: 'personal',
    id: 'account-personal',
  })
  form.register('accountType', {
    type: 'radio',
    value: 'company',
    id: 'account-company',
  })
}

void _options
void unregisterTypeChecks
void existingInferenceRemains
void controllerShouldUnregister
void radioIdOptionIsTyped

export {}
