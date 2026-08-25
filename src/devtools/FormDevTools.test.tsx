import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { memo, StrictMode, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { FormProvider, useForm, useWatch } from '../hooks/useForm'
import * as core from '../hooks/useForm'
import { FormDevTools } from './index.ts'

type Sample = {
  email: string
  password: string
  avatar: File | null
}

const defaults: Sample = { email: '', password: '', avatar: null }

describe('FormDevTools', () => {
  describe('exports', () => {
    it('is not exported from the core barrel', () => {
      expect(core).not.toHaveProperty('FormDevTools')
      expect(core).not.toHaveProperty('standardSchemaResolver')
    })
  })

  describe('control resolution', () => {
    it('renders with an explicit control', () => {
      const { result } = renderHook(() => useForm<Sample>({ defaultValues: defaults }))
      render(<FormDevTools control={result.current.control} position="inline" />)
      expect(screen.getByRole('complementary', { name: 'Form DevTools' })).toBeInTheDocument()
    })

    it('resolves control from context', () => {
      const { result } = renderHook(() => useForm<Sample>({ defaultValues: defaults }))
      render(
        <FormProvider control={result.current.control}>
          <FormDevTools position="inline" />
        </FormProvider>,
      )
      expect(screen.getByLabelText('Form DevTools')).toBeInTheDocument()
    })

    it('throws a named error when control is missing', () => {
      expect(() => render(<FormDevTools />)).toThrow(/FormDevTools requires a FormControl/)
    })

    it('switches subscriptions when control changes', () => {
      const { result: first } = renderHook(() => useForm<Sample>({ defaultValues: defaults }))
      const { result: second } = renderHook(() =>
        useForm<Sample>({ defaultValues: { email: 'b@example.com', password: '', avatar: null } }),
      )

      function Harness({ control }: { control: (typeof first)['current']['control'] }) {
        return <FormDevTools control={control} position="inline" />
      }

      const view = render(<Harness control={first.current.control} />)
      act(() => {
        first.current.setValue('email', 'a@example.com')
      })
      expect(screen.getByText(/a@example.com/)).toBeInTheDocument()

      view.rerender(<Harness control={second.current.control} />)
      expect(screen.queryByText(/a@example.com/)).not.toBeInTheDocument()
      expect(screen.getByText(/b@example.com/)).toBeInTheDocument()
    })
  })

  describe('ui', () => {
    it('toggles open state with an accessible button', () => {
      const { result } = renderHook(() => useForm<Sample>({ defaultValues: defaults }))
      render(<FormDevTools control={result.current.control} position="bottom-left" />)
      const toggle = screen.getByRole('button', { name: 'Collapse' })
      expect(toggle).toHaveAttribute('aria-expanded', 'true')
      act(() => {
        toggle.click()
      })
      expect(screen.getByRole('button', { name: 'Expand' })).toHaveAttribute(
        'aria-expanded',
        'false',
      )
      expect(screen.queryByRole('tab', { name: /Values/ })).not.toBeInTheDocument()
    })

    it('returns null when disabled', () => {
      const { result } = renderHook(() => useForm<Sample>({ defaultValues: defaults }))
      const { container } = render(
        <FormDevTools control={result.current.control} enabled={false} />,
      )
      expect(container).toBeEmptyDOMElement()
    })

    it('sets the configured position', () => {
      const { result } = renderHook(() => useForm<Sample>({ defaultValues: defaults }))
      render(<FormDevTools control={result.current.control} position="bottom-right" />)
      expect(screen.getByLabelText('Form DevTools')).toHaveAttribute(
        'data-position',
        'bottom-right',
      )
    })

    it('floats inline inspector to the viewport and docks it back', () => {
      const { result } = renderHook(() => useForm<Sample>({ defaultValues: defaults }))
      const view = render(
        <div data-testid="host">
          <FormDevTools control={result.current.control} position="inline" />
        </div>,
      )
      const host = view.getByTestId('host')
      expect(host.querySelector('[data-form-devtools]')).not.toBeNull()

      act(() => {
        screen.getByRole('button', { name: 'Float over page' }).click()
      })
      const floating = screen.getByLabelText('Form DevTools')
      expect(floating).toHaveAttribute('data-position', 'bottom-right')
      expect(floating.parentElement).toBe(document.body)
      expect(host.querySelector('[data-form-devtools]')).toBeNull()

      act(() => {
        screen.getByRole('button', { name: 'Dock inline' }).click()
      })
      expect(screen.getByLabelText('Form DevTools')).toHaveAttribute('data-position', 'inline')
      expect(host.querySelector('[data-form-devtools]')).not.toBeNull()
    })

    it('drags and resizes the floating panel', () => {
      const { result } = renderHook(() => useForm<Sample>({ defaultValues: defaults }))
      render(<FormDevTools control={result.current.control} position="inline" />)

      act(() => {
        screen.getByRole('button', { name: 'Float over page' }).click()
      })

      const panel = screen.getByLabelText('Form DevTools')
      const header = panel.querySelector('.fd-header')
      expect(header).not.toBeNull()

      const startX = Number.parseFloat(panel.style.left)
      const startY = Number.parseFloat(panel.style.top)
      expect(startX).toBeGreaterThan(0)
      expect(startY).toBeGreaterThan(0)

      fireEvent.pointerDown(header!, {
        button: 0,
        clientX: startX + 24,
        clientY: startY + 12,
        pointerId: 1,
      })
      fireEvent.pointerMove(header!, {
        clientX: startX + 24 - 120,
        clientY: startY + 12 - 90,
        pointerId: 1,
      })
      fireEvent.pointerUp(header!, { pointerId: 1 })

      expect(Number.parseFloat(panel.style.left)).toBeLessThan(startX)
      expect(Number.parseFloat(panel.style.top)).toBeLessThan(startY)

      const resize = screen.getByRole('button', { name: 'Resize DevTools' })
      const widthBefore = Number.parseFloat(panel.style.width)
      const heightBefore = Number.parseFloat(panel.style.height)

      fireEvent.pointerDown(resize, {
        button: 0,
        clientX: 400,
        clientY: 400,
        pointerId: 2,
      })
      fireEvent.pointerMove(resize, {
        clientX: 520,
        clientY: 500,
        pointerId: 2,
      })
      fireEvent.pointerUp(resize, { pointerId: 2 })

      expect(Number.parseFloat(panel.style.width)).toBeGreaterThan(widthBefore)
      expect(Number.parseFloat(panel.style.height)).toBeGreaterThan(heightBefore)
    })

    it('stacks collapsed floating inspectors at the bottom-right', () => {
      const { result: first } = renderHook(() => useForm<Sample>({ defaultValues: defaults }))
      const { result: second } = renderHook(() => useForm<Sample>({ defaultValues: defaults }))
      render(
        <>
          <FormDevTools control={first.current.control} position="inline" />
          <FormDevTools control={second.current.control} position="inline" />
        </>,
      )

      const floatButtons = screen.getAllByRole('button', { name: 'Float over page' })
      act(() => {
        floatButtons[0]!.click()
        floatButtons[1]!.click()
      })

      const collapseButtons = screen.getAllByRole('button', { name: 'Collapse' })
      act(() => {
        collapseButtons[0]!.click()
        collapseButtons[1]!.click()
      })

      const panels = screen.getAllByLabelText('Form DevTools')
      expect(panels).toHaveLength(2)
      expect(panels[0]).toHaveStyle({ right: '16px', bottom: '16px' })
      expect(panels[1]).toHaveStyle({ right: '16px', bottom: '68px' })
    })

    it('raises z-index when a floating inspector is activated', () => {
      const { result: first } = renderHook(() => useForm<Sample>({ defaultValues: defaults }))
      const { result: second } = renderHook(() => useForm<Sample>({ defaultValues: defaults }))
      render(
        <>
          <FormDevTools control={first.current.control} position="bottom-right" />
          <FormDevTools control={second.current.control} position="bottom-right" />
        </>,
      )

      const panels = screen.getAllByLabelText('Form DevTools')
      const firstZ = Number.parseInt(panels[0]!.style.zIndex, 10)
      const secondZ = Number.parseInt(panels[1]!.style.zIndex, 10)
      expect(secondZ).toBeGreaterThan(firstZ)

      fireEvent.pointerDown(panels[0]!)
      expect(Number.parseInt(panels[0]!.style.zIndex, 10)).toBeGreaterThan(
        Number.parseInt(panels[1]!.style.zIndex, 10),
      )
    })
  })

  describe('privacy and updates', () => {
    it('redacts passwords and never exposes file contents', () => {
      const { result } = renderHook(() => useForm<Sample>({ defaultValues: defaults }))
      render(<FormDevTools control={result.current.control} position="inline" />)
      const file = new File(['secret-bytes'], 'avatar.png', { type: 'image/png' })
      act(() => {
        result.current.setValue('password', 'hunter2-secret')
        result.current.setValue('avatar', file)
        result.current.setError('email', 'Required')
      })
      expect(screen.queryByText(/hunter2-secret/)).not.toBeInTheDocument()
      expect(screen.queryByText(/secret-bytes/)).not.toBeInTheDocument()
      expect(screen.getByText(/avatar.png/)).toBeInTheDocument()
      act(() => {
        screen.getByRole('tab', { name: /Errors/ }).click()
      })
      expect(screen.getByText(/Required/)).toBeInTheDocument()
      act(() => {
        result.current.setError('password', 'Password is required')
        screen.getByRole('tab', { name: /Details/ }).click()
      })
      expect(screen.getByText('password')).toBeInTheDocument()
      expect(screen.getByText('Password is required')).toBeInTheDocument()
      expect(screen.queryByText(/^redacted$/i)).not.toBeInTheDocument()
    })

    it('does not redact touched/dirty booleans under password-named paths', () => {
      const { result } = renderHook(() => useForm<Sample>({ defaultValues: defaults }))
      render(<FormDevTools control={result.current.control} position="inline" />)
      act(() => {
        result.current.setValue('password', 'hunter2-secret', { shouldTouch: true })
        screen.getByRole('tab', { name: /State/ }).click()
      })
      expect(screen.queryByText(/hunter2-secret/)).not.toBeInTheDocument()
      expect(screen.getAllByText('password').length).toBeGreaterThan(0)
      expect(screen.getAllByText('true').length).toBeGreaterThan(0)
      expect(screen.queryByText(/^redacted$/i)).not.toBeInTheDocument()
    })

    it('can hide filenames and redact complete file fields', () => {
      const { result } = renderHook(() => useForm<Sample>({ defaultValues: defaults }))
      const file = new File(['secret-bytes'], 'payroll.pdf', { type: 'application/pdf' })
      const view = render(
        <FormDevTools control={result.current.control} position="inline" hideFileNames />,
      )
      act(() => {
        result.current.setValue('avatar', file)
      })
      expect(screen.queryByText(/payroll.pdf/)).not.toBeInTheDocument()
      expect(screen.queryByText(/secret-bytes/)).not.toBeInTheDocument()

      view.rerender(<FormDevTools control={result.current.control} position="inline" redactFiles />)
      expect(screen.queryByText(/payroll.pdf/)).not.toBeInTheDocument()
      expect(screen.getAllByText(/redacted/).length).toBeGreaterThan(0)
    })
  })

  describe('isolation', () => {
    it('does not rerender a narrowly subscribed form child', () => {
      let childRenders = 0
      const Child = memo(function Child({
        control,
      }: {
        control: ReturnType<typeof useForm<Sample>>['control']
      }) {
        childRenders += 1
        useWatch({ control, name: 'email' })
        return <span>child</span>
      })

      function Harness() {
        const form = useForm<Sample>({ defaultValues: defaults })
        const [, setTick] = useState(0)
        return (
          <div>
            <button type="button" onClick={() => setTick((value) => value + 1)}>
              bump
            </button>
            <Child control={form.control} />
            <FormDevTools control={form.control} position="inline" />
            <button
              type="button"
              onClick={() => {
                form.setValue('password', 'changed')
              }}
            >
              change password
            </button>
          </div>
        )
      }

      render(<Harness />)
      const start = childRenders
      act(() => {
        screen.getByRole('button', { name: 'change password' }).click()
      })
      expect(childRenders).toBe(start)
    })

    it('cleans up under Strict Mode', () => {
      const { result } = renderHook(() => useForm<Sample>({ defaultValues: defaults }))
      const { unmount } = render(
        <StrictMode>
          <FormDevTools control={result.current.control} position="inline" />
        </StrictMode>,
      )
      expect(screen.getByLabelText('Form DevTools')).toBeInTheDocument()
      unmount()
    })
  })
})
