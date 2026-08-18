/**
 * SSR-safe browser file helpers.
 * Avoid referencing `File` / `HTMLInputElement` at module init.
 */

export function isFile(value: unknown): value is File {
  return typeof File !== 'undefined' && value instanceof File
}

export function isBlob(value: unknown): value is Blob {
  return typeof Blob !== 'undefined' && value instanceof Blob
}

export function isFileList(value: unknown): value is FileList {
  return typeof FileList !== 'undefined' && value instanceof FileList
}

/** Normalize a field value into `File[]` for shared file rules. */
export function normalizeToFiles(value: unknown): File[] {
  if (value == null) return []
  if (isFile(value)) return [value]
  if (Array.isArray(value)) return value.filter(isFile)
  return []
}

/**
 * Parse a file input change into form state.
 * Never stores `FileList` — always `File | null` or `File[]`.
 */
export function parseFileInputValue(
  target: EventTarget | null,
  multiple: boolean,
): File | null | File[] {
  if (typeof HTMLInputElement === 'undefined' || !(target instanceof HTMLInputElement)) {
    return multiple ? [] : null
  }

  const list = target.files
  if (multiple) {
    return list ? Array.from(list) : []
  }
  return list?.[0] ?? null
}

/** Clears a native file input. Only `''` is assigned — never a non-empty value. */
export function clearNativeFileInput(element: unknown): void {
  if (typeof HTMLInputElement === 'undefined') return
  if (element instanceof HTMLInputElement && element.type === 'file') {
    element.value = ''
  }
}

/** Whether restored/set form state should clear the visible native file selection. */
export function shouldClearNativeFileInput(value: unknown): boolean {
  if (value === null || value === undefined) return true
  return Array.isArray(value) && value.length === 0
}

export function normalizeExtension(extension: string): string {
  const trimmed = extension.trim().toLowerCase()
  return trimmed.startsWith('.') ? trimmed.slice(1) : trimmed
}

export function getFileExtension(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? fileName
  const index = base.lastIndexOf('.')
  if (index <= 0 || index === base.length - 1) return ''
  return base.slice(index + 1).toLowerCase()
}
