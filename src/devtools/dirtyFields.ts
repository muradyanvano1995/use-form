/** Compact dirty-field map for the State tab — avoids core pathUtilities in the DevTools bundle. */
export function computeDevToolsDirtyFields(
  values: unknown,
  defaults: unknown,
): Record<string, true> {
  const dirty: Record<string, true> = {}
  walk(values, defaults, '', dirty)
  return dirty
}

function isPlain(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const proto: object | null = Object.getPrototypeOf(value) as object | null
  return proto === Object.prototype || proto === null
}

function leafEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
    for (let i = 0; i < a.length; i += 1) {
      if (!Object.is(a[i], b[i])) return false
    }
    return true
  }
  return false
}

function walk(
  values: unknown,
  defaults: unknown,
  prefix: string,
  dirty: Record<string, true>,
): void {
  if (Array.isArray(values) || Array.isArray(defaults)) {
    if (!Array.isArray(values) || !Array.isArray(defaults) || !leafEqual(values, defaults)) {
      if (prefix) dirty[prefix] = true
      if (Array.isArray(values) && Array.isArray(defaults)) {
        const max = Math.max(values.length, defaults.length)
        for (let i = 0; i < max; i += 1) {
          const path = prefix ? `${prefix}.${i}` : String(i)
          if (i >= values.length || i >= defaults.length || !Object.is(values[i], defaults[i])) {
            if (isPlain(values[i]) && isPlain(defaults[i]))
              walk(values[i], defaults[i], path, dirty)
            else dirty[path] = true
          }
        }
      }
    }
    return
  }

  if (!isPlain(values) || !isPlain(defaults)) {
    if (!leafEqual(values, defaults) && prefix) dirty[prefix] = true
    return
  }

  const keys = new Set([...Object.keys(values), ...Object.keys(defaults)])
  for (const key of keys) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') continue
    const path = prefix ? `${prefix}.${key}` : key
    const left = values[key]
    const right = defaults[key]
    if (isPlain(left) && isPlain(right)) walk(left, right, path, dirty)
    else if (Array.isArray(left) || Array.isArray(right)) walk(left, right, path, dirty)
    else if (!Object.is(left, right)) dirty[path] = true
  }
}
