import { act, render, renderHook, screen } from '@testing-library/react'
import { memo, StrictMode, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { FormProvider, useForm, useWatch } from '../hooks/useForm/index.ts'
import * as core from '../hooks/useForm/index.ts'
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
      expect(screen.queryByRole('button', { name: /Values/ })).not.toBeInTheDocument()
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
      expect(screen.getByText(/Required/)).toBeInTheDocument()
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
      expect(screen.getByText(/redacted/)).toBeInTheDocument()
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
