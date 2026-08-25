export type DevToolsRedactionPredicate = (path: string, key: string) => boolean

export type DevToolsPosition = 'bottom-right' | 'bottom-left' | 'inline'

const DEFAULT_SENSITIVE_TOKENS = [
  'password',
  'passcode',
  'secret',
  'token',
  'apikey',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'creditcard',
  'cardnumber',
  'cvv',
  'cvc',
] as const

const DEFAULT_MAX_DEPTH = 8
const DEFAULT_MAX_ENTRIES = 200

export type SafeSerializeOptions = {
  redactPaths?: readonly string[]
  redact?: DevToolsRedactionPredicate
  redactFiles?: boolean
  /**
   * When false, skip default sensitive-key heuristics (`password`, `token`, …).
   * Explicit `redactPaths` / `redact` still apply. Default: true.
   */
  redactSensitiveKeys?: boolean
  /** When true, File metadata omits `name`. Contents are never read either way. */
  hideFileNames?: boolean
  maxDepth?: number
  maxEntries?: number
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

const NORMALIZED_SENSITIVE = DEFAULT_SENSITIVE_TOKENS.map(normalizeToken)

function isDefaultSensitiveKey(key: string): boolean {
  const normalized = normalizeToken(key)
  if (normalized.length === 0) return false
  return NORMALIZED_SENSITIVE.some((token) => normalized.includes(token))
}

function joinPath(parent: string, key: string): string {
  return parent.length === 0 ? key : `${parent}.${key}`
}

function pathIsRedacted(path: string, redactPaths: readonly string[]): boolean {
  for (const candidate of redactPaths) {
    if (path === candidate || path.startsWith(`${candidate}.`)) return true
  }
  return false
}

function shouldRedact(path: string, key: string, options: SafeSerializeOptions): boolean {
  if (pathIsRedacted(path, options.redactPaths ?? [])) return true
  if (options.redact?.(path, key)) return true
  if (options.redactSensitiveKeys === false) return false
  if (isDefaultSensitiveKey(key)) return true
  return path.split('.').some((segment) => isDefaultSensitiveKey(segment))
}

function describeFile(file: File, hideFileNames: boolean): Record<string, unknown> {
  const described: Record<string, unknown> = {
    $dev: 'File',
    type: file.type,
    size: file.size,
  }
  if (!hideFileNames) {
    described.name = file.name
  }
  return described
}

function readOwnDataKeys(value: object): string[] {
  const names = Object.getOwnPropertyNames(value).filter(
    (key) => key !== '__proto__' && key !== 'prototype' && key !== 'constructor',
  )
  names.sort()
  return names
}

/**
 * Development-only serializer. Does not call `toJSON()`, does not read File/Blob
 * contents, and does not mutate the input.
 */
export function safeSerialize(value: unknown, options: SafeSerializeOptions = {}): unknown {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES
  const seen = new WeakMap<object, unknown>()

  const walk = (current: unknown, path: string, depth: number): unknown => {
    if (current === null || current === undefined) return current
    if (typeof current === 'bigint') return `${current}n`
    if (
      typeof current === 'string' ||
      typeof current === 'number' ||
      typeof current === 'boolean'
    ) {
      return current
    }
    if (typeof current === 'symbol') {
      return { $dev: 'symbol', description: current.description }
    }
    if (typeof current === 'function') {
      return { $dev: 'Function', name: current.name || '(anonymous)' }
    }
    if (depth >= maxDepth) return { $dev: 'maxDepth' }

    if (typeof current === 'object') {
      const cached = seen.get(current)
      if (cached !== undefined) return { $dev: 'circular' }

      if (typeof File !== 'undefined' && current instanceof File) {
        if (options.redactFiles || shouldRedact(path, path.split('.').pop() ?? '', options)) {
          return { $dev: 'redacted' }
        }
        return describeFile(current, options.hideFileNames === true)
      }
      if (typeof Blob !== 'undefined' && current instanceof Blob) {
        return { $dev: 'Blob', type: current.type, size: current.size }
      }
      if (current instanceof Date) {
        const time = current.getTime()
        return { $dev: 'Date', iso: Number.isNaN(time) ? 'NaN' : current.toISOString() }
      }
      if (current instanceof Map) {
        return { $dev: 'Map', size: current.size }
      }
      if (current instanceof Set) {
        return { $dev: 'Set', size: current.size }
      }
      if (Array.isArray(current)) {
        const result: unknown[] = []
        seen.set(current, result)
        const limit = Math.min(current.length, maxEntries)
        for (let index = 0; index < limit; index += 1) {
          const childPath = joinPath(path, String(index))
          const key = String(index)
          if (shouldRedact(childPath, key, options)) {
            result.push({ $dev: 'redacted' })
          } else {
            result.push(walk(current[index], childPath, depth + 1))
          }
        }
        if (current.length > maxEntries) {
          result.push({ $dev: 'truncated', omitted: current.length - maxEntries })
        }
        return result
      }

      const proto: object | null = Object.getPrototypeOf(current) as object | null
      const isPlain = proto === Object.prototype || proto === null
      if (!isPlain) {
        const ctor = (current as { constructor?: { name?: string } }).constructor
        return { $dev: 'Class', name: ctor?.name || 'Object' }
      }

      const result: Record<string, unknown> = {}
      seen.set(current, result)
      const keys = readOwnDataKeys(current)
      const limit = Math.min(keys.length, maxEntries)
      for (let index = 0; index < limit; index += 1) {
        const key = keys[index]
        const childPath = joinPath(path, key)
        if (shouldRedact(childPath, key, options)) {
          result[key] = { $dev: 'redacted' }
          continue
        }
        const descriptor = Object.getOwnPropertyDescriptor(current, key)
        if (descriptor?.get && !descriptor.value) {
          result[key] = { $dev: 'getter' }
          continue
        }
        result[key] = walk((current as Record<string, unknown>)[key], childPath, depth + 1)
      }
      if (keys.length > maxEntries) {
        result.$devTruncated = { $dev: 'truncated', omitted: keys.length - maxEntries }
      }
      return result
    }

    return { $dev: 'unknown' }
  }

  return walk(value, '', 0)
}

export function formatSerialized(value: unknown): string {
  return JSON.stringify(value, null, 2)
}
