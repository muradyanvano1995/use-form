export function GithubSourceLink({ path }: { path: string }) {
  const href = path.startsWith('http')
    ? path
    : `https://github.com/muradyanvano1995/use-form/blob/main/${path}`
  return (
    <p className="docs-source-link">
      <a href={href} rel="noreferrer">
        View complete implementation on GitHub
      </a>
    </p>
  )
}
