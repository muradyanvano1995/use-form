export const SENSITIVE_FIELD_NAMES = [
  'password',
  'confirmPassword',
  'currentPassword',
  'newPassword',
  'token',
  'secret',
] as const

export function isSensitiveFieldName(name: string): boolean {
  const lower = name.toLowerCase()
  return SENSITIVE_FIELD_NAMES.some(
    (field) => lower === field.toLowerCase() || lower.endsWith(`.${field.toLowerCase()}`),
  )
}

export function redactFileMeta(file: File | null | undefined): {
  name: string
  type: string
  size: number
} | null {
  if (!file) return null
  return { name: file.name, type: file.type, size: file.size }
}

export function redactFormPayload(value: unknown): unknown {
  if (typeof File !== 'undefined' && value instanceof File) {
    return redactFileMeta(value)
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactFormPayload(item))
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, nested]) => {
      if (isSensitiveFieldName(key)) return [key, '[redacted]']
      return [key, redactFormPayload(nested)]
    })
    return Object.fromEntries(entries)
  }
  return value
}
