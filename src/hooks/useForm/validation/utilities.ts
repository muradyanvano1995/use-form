/**
 * Empty for optional-rule skipping and required checks.
 * - `null` / `undefined` → empty
 * - whitespace-only strings → empty
 * - `NaN` → empty (number inputs cleared in the DOM)
 * - empty arrays (`[]`) → empty (optional `File[]` fields)
 * - `0` and `false` are **not** empty
 */
export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string' && value.trim() === '') return true
  if (Array.isArray(value) && value.length === 0) return true
  return typeof value === 'number' && Number.isNaN(value)
}

/**
 * Test a RegExp without mutating sticky/`g` lastIndex state on the caller's instance.
 */
export function testPattern(pattern: RegExp, value: string): boolean {
  const flags = pattern.flags.replaceAll('g', '').replaceAll('y', '')
  return new RegExp(pattern.source, flags).test(value)
}

/** Practical email check — not a full RFC implementation. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
