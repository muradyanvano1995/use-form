import type { ReactNode } from 'react'

export function JsonValue({ value, root = false }: { value: unknown; root?: boolean }): ReactNode {
  if (value === null || value === undefined) {
    return <span className="fd-null">{String(value)}</span>
  }
  if (typeof value === 'string') {
    return <span className="fd-string">&quot;{value}&quot;</span>
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return <span className="fd-number">{String(value)}</span>
  }
  if (typeof value === 'boolean') {
    return <span className="fd-boolean">{String(value)}</span>
  }
  if (Array.isArray(value)) {
    const list = value as unknown[]
    if (list.length === 0) return <span className="fd-punct">[]</span>
    return (
      <ul className={`fd-tree${root ? ' fd-tree-root' : ''}`}>
        {list.map((item, index) => (
          <li key={index} className="fd-row-block">
            <span className="fd-punct">[{index}]</span> <JsonValue value={item} />
          </li>
        ))}
      </ul>
    )
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const tag = record.$dev
    if (typeof tag === 'string') {
      if (tag === 'redacted') {
        return <span className="fd-badge fd-badge-redacted">redacted</span>
      }
      if (tag === 'File' || tag === 'Blob') {
        const name = typeof record.name === 'string' ? record.name : undefined
        const type = typeof record.type === 'string' ? record.type : undefined
        const size = typeof record.size === 'number' ? record.size : undefined
        return (
          <span className="fd-badge fd-badge-file">
            {tag}
            {name ? ` ${name}` : ''}
            {type ? ` · ${type}` : ''}
            {size != null ? ` · ${size}B` : ''}
          </span>
        )
      }
      return (
        <span className="fd-badge fd-badge-meta">
          {tag}
          {typeof record.name === 'string' ? ` ${record.name}` : ''}
        </span>
      )
    }
    const entries = Object.entries(record)
    if (entries.length === 0) return <span className="fd-punct">{'{}'}</span>
    return (
      <ul className={`fd-tree${root ? ' fd-tree-root' : ''}`}>
        {entries.map(([key, child]) => {
          const recordChild = child as Record<string, unknown> | null
          const nested =
            child !== null &&
            typeof child === 'object' &&
            !Array.isArray(child) &&
            typeof recordChild?.$dev !== 'string'
          const isArrayChild = Array.isArray(child)
          if (nested || isArrayChild) {
            return (
              <li key={key} className="fd-row-block">
                <div className="fd-key">{key}</div>
                <JsonValue value={child} />
              </li>
            )
          }
          return (
            <li key={key} className="fd-row">
              <span className="fd-key">{key}</span>
              <span className="fd-row-value">
                <JsonValue value={child} />
              </span>
            </li>
          )
        })}
      </ul>
    )
  }
  return <span className="fd-null">{typeof value}</span>
}
