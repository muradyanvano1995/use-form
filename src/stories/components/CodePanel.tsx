import { useEffect, useId, useState, type ReactNode } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism/index.js'

export const COPY_RESTORE_MS = 2000

async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fall through to the execCommand path.
    }
  }

  if (typeof document === 'undefined') {
    return false
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.append(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    textarea.remove()
    return ok
  } catch {
    return false
  }
}

export function CodePanel({ title, code }: { title?: string; code: string }) {
  const statusId = useId()
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  useEffect(() => {
    if (status === 'idle') {
      return undefined
    }
    const timer = window.setTimeout(() => {
      setStatus('idle')
    }, COPY_RESTORE_MS)
    return () => {
      window.clearTimeout(timer)
    }
  }, [status])

  let statusMessage: ReactNode = null
  if (status === 'copied') {
    statusMessage = 'Copied'
  } else if (status === 'failed') {
    statusMessage = 'Copy failed'
  }

  return (
    <figure className="docs-code">
      <div className="docs-code__toolbar">
        {title ? <figcaption className="docs-code__header">{title}</figcaption> : <span />}
        <button
          type="button"
          className="docs-code__copy"
          aria-label="Copy code"
          aria-describedby={status === 'idle' ? undefined : statusId}
          onClick={() => {
            void copyText(code).then((ok) => {
              setStatus(ok ? 'copied' : 'failed')
            })
          }}
        >
          {status === 'copied' ? 'Copied' : status === 'failed' ? 'Copy failed' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language="tsx"
        // Let our CSS drive theme-friendly colors (no inline background).
        // `useInlineStyles={false}` keeps semantic token classNames like `token keyword`.
        useInlineStyles={false}
        style={document?.documentElement.getAttribute('data-theme') === 'dark' ? oneDark : oneLight}
        showLineNumbers={false}
        wrapLongLines={false}
        // Keep surface/background/layout controlled by our existing `.docs-code` CSS.
        customStyle={{}}
        // Avoid Prism's default black text / text-shadow so token classes win.
        codeTagProps={{ style: { color: 'inherit', background: 'none', textShadow: 'none' } }}
        PreTag="pre"
      >
        {code}
      </SyntaxHighlighter>
      <p id={statusId} className="docs-code__status" role="status" aria-live="polite">
        {statusMessage}
      </p>
    </figure>
  )
}
