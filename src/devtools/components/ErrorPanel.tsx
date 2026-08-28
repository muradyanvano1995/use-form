type IssueLike = {
  message?: unknown
  type?: unknown
  source?: unknown
}

type ErrorLike = {
  message?: unknown
  type?: unknown
  source?: unknown
  issues?: unknown
}

function readText(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function MetaPills({ type, source }: { type?: string; source?: string }) {
  if (!type && !source) return null
  return (
    <div className="fd-card-meta">
      {source ? <span className="fd-pill">{source}</span> : null}
      {type ? <span className="fd-pill">{type}</span> : null}
    </div>
  )
}

function ErrorDetailCard({ path, error }: { path: string; error: ErrorLike }) {
  const message = readText(error.message) ?? 'Invalid'
  const type = readText(error.type)
  const source = readText(error.source)
  const issues = Array.isArray(error.issues) ? (error.issues as IssueLike[]) : []
  const showIssueList =
    issues.length > 1 || (issues.length === 1 && readText(issues[0]?.message) !== message)

  return (
    <article className="fd-card">
      <div className="fd-card-head">
        <h4 className="fd-card-path">{path}</h4>
        <MetaPills type={type} source={source} />
      </div>
      <p className="fd-card-msg">{message}</p>
      {showIssueList ? (
        <ul className="fd-issues">
          {issues.map((issue, index) => {
            const issueMessage = readText(issue.message) ?? 'Invalid'
            return (
              <li key={`${path}-${index}-${issueMessage}`} className="fd-issue">
                <p className="fd-issue-label">Issue {index + 1}</p>
                <p className="fd-issue-msg">{issueMessage}</p>
                <MetaPills type={readText(issue.type)} source={readText(issue.source)} />
              </li>
            )
          })}
        </ul>
      ) : null}
    </article>
  )
}

export function ErrorsMessagesPanel({
  errors,
  rootError,
}: {
  errors: unknown
  rootError: string | undefined
}) {
  const entries =
    errors && typeof errors === 'object'
      ? Object.entries(errors as Record<string, unknown>).filter(
          ([, message]) => typeof message === 'string' && message.length > 0,
        )
      : []

  if (entries.length === 0 && !rootError) {
    return <p className="fd-empty">No errors.</p>
  }

  return (
    <div className="fd-cards">
      {rootError ? (
        <article className="fd-card">
          <div className="fd-card-head">
            <h4 className="fd-card-path">root</h4>
          </div>
          <p className="fd-card-msg">{rootError}</p>
        </article>
      ) : null}
      {entries.map(([path, message]) => (
        <article key={path} className="fd-card">
          <div className="fd-card-head">
            <h4 className="fd-card-path">{path}</h4>
          </div>
          <p className="fd-card-msg">{String(message)}</p>
        </article>
      ))}
    </div>
  )
}

export function ErrorDetailsPanel({
  errorDetails,
  rootErrorDetails,
}: {
  errorDetails: unknown
  rootErrorDetails: unknown
}) {
  const entries =
    errorDetails && typeof errorDetails === 'object'
      ? Object.entries(errorDetails as Record<string, unknown>).filter(
          ([, value]) => value != null && typeof value === 'object',
        )
      : []
  const root =
    rootErrorDetails && typeof rootErrorDetails === 'object'
      ? (rootErrorDetails as ErrorLike)
      : undefined

  if (entries.length === 0 && !root) {
    return <p className="fd-empty">No details.</p>
  }

  return (
    <div className="fd-cards">
      {root ? <ErrorDetailCard path="root" error={root} /> : null}
      {entries.map(([path, value]) => (
        <ErrorDetailCard key={path} path={path} error={value as ErrorLike} />
      ))}
    </div>
  )
}
