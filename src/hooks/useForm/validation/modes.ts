/**
 * Supported initial validation timing modes.
 * Prefer these constants for autocomplete; string literals remain valid.
 */
export const ValidationMode = {
  OnSubmit: 'onSubmit',
  OnBlur: 'onBlur',
  OnChange: 'onChange',
} as const

export type ValidationMode = (typeof ValidationMode)[keyof typeof ValidationMode]

/**
 * Supported revalidation timing after the form has been submitted once.
 */
export const ReValidateMode = {
  OnChange: 'onChange',
  OnBlur: 'onBlur',
  OnSubmit: 'onSubmit',
} as const

export type ReValidateMode = (typeof ReValidateMode)[keyof typeof ReValidateMode]
