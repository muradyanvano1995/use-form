import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CodePanel, COPY_RESTORE_MS } from './CodePanel.tsx'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  Reflect.deleteProperty(navigator, 'clipboard')
  Reflect.deleteProperty(document, 'execCommand')
})

function stubClipboardWriteText(writeText: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })
}

function stubExecCommand(result: boolean) {
  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    writable: true,
    value: vi.fn(() => result),
  })
}

describe('CodePanel', () => {
  it('copies code with the clipboard API and announces success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<CodePanel title="Example" code="const x = 1" />)
    stubClipboardWriteText(writeText)

    await user.click(screen.getByRole('button', { name: 'Copy code' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('const x = 1'))
    expect(screen.getByRole('status')).toHaveTextContent('Copied')
    expect(screen.getByRole('button', { name: 'Copy code' })).toHaveTextContent('Copied')
  })

  it('copies from the keyboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<CodePanel code="keyboard copy" />)
    stubClipboardWriteText(writeText)

    screen.getByRole('button', { name: 'Copy code' }).focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('keyboard copy'))
    expect(screen.getByRole('status')).toHaveTextContent('Copied')
  })

  it('restores the visible label after the deterministic interval', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboardWriteText(writeText)
    render(<CodePanel code="export const n = 2" />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }))
    await act(async () => {
      await writeText.mock.results[0]?.value
    })
    expect(screen.getByRole('button', { name: 'Copy code' })).toHaveTextContent('Copied')

    await act(() => {
      vi.advanceTimersByTime(COPY_RESTORE_MS)
    })
    expect(screen.getByRole('button', { name: 'Copy code' })).toHaveTextContent('Copy')
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it('announces a failure when clipboard is unavailable', async () => {
    const user = userEvent.setup()
    render(<CodePanel code="failed" />)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    })
    stubExecCommand(false)

    await user.click(screen.getByRole('button', { name: 'Copy code' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Copy failed'))
    expect(screen.getByRole('button', { name: 'Copy code' })).toHaveTextContent('Copy failed')
  })
})
