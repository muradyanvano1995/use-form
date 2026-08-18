export const GITHUB_BLOB = 'https://github.com/muradyanvano1995/use-form/blob/main'

export function githubExamplePath(fileName: string): string {
  return `${GITHUB_BLOB}/src/examples/${fileName}`
}

export function consumerDocsSource(code: string) {
  return {
    language: 'tsx' as const,
    type: 'code' as const,
    code,
  }
}

export function withGithubExample(description: string, fileName: string): string {
  return `${description} [View complete implementation on GitHub](${githubExamplePath(fileName)}).`
}
