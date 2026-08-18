import type { ReactNode } from 'react'

export function DocsPage({ children }: { children: ReactNode }) {
  return <article className="docs-page">{children}</article>
}

export function Kicker({ children }: { children: ReactNode }) {
  return <p className="docs-kicker">{children}</p>
}

export function Callout({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warning' | 'success'
  title: string
  children: ReactNode
}) {
  return (
    <aside className={`docs-callout docs-callout--${tone}`} aria-label={title}>
      <p className="docs-callout__title">{title}</p>
      <div>{children}</div>
    </aside>
  )
}

export function FeatureList({ items }: { items: ReadonlyArray<{ title: string; body: string }> }) {
  return (
    <ul className="docs-features">
      {items.map((item) => (
        <li key={item.title}>
          <strong>{item.title}</strong>
          <span>{item.body}</span>
        </li>
      ))}
    </ul>
  )
}

export function CodePanel({ title, code }: { title?: string; code: string }) {
  return (
    <figure className="docs-code">
      {title ? <figcaption className="docs-code__header">{title}</figcaption> : null}
      <pre>
        <code>{code}</code>
      </pre>
    </figure>
  )
}

export function ApiTable({
  rows,
}: {
  rows: ReadonlyArray<{ name: string; kind: string; notes: string }>
}) {
  return (
    <div className="docs-table-wrap">
      <table className="docs-table">
        <thead>
          <tr>
            <th scope="col">Export</th>
            <th scope="col">Kind</th>
            <th scope="col">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td>
                <code>{row.name}</code>
              </td>
              <td>{row.kind}</td>
              <td>{row.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ExampleShell({
  title,
  description,
  children,
  wide = false,
}: {
  title: string
  description?: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className={wide ? 'docs-example docs-example--wide' : 'docs-example'}>
      <header>
        <h2>{title}</h2>
        {description ? <p className="docs-lead">{description}</p> : null}
      </header>
      {children}
    </div>
  )
}

export function StateInspector({
  title = 'Form snapshot',
  value,
}: {
  title?: string
  value: unknown
}) {
  return (
    <section>
      <h3>{title}</h3>
      <pre className="docs-inspector">{JSON.stringify(value, null, 2)}</pre>
    </section>
  )
}
