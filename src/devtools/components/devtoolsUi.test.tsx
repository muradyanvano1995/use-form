import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ErrorDetailsPanel, ErrorsMessagesPanel } from './ErrorPanel.tsx'
import { JsonValue } from './JsonTree.tsx'

describe('JsonValue', () => {
  it('renders primitives, redacted badges, and nested keys', () => {
    render(
      <JsonValue
        root
        value={{
          email: 'a@example.com',
          password: { $dev: 'redacted' },
          avatar: { $dev: 'File', name: 'a.png', type: 'image/png', size: 12 },
          nested: { city: 'NYC' },
          list: [1, true, null],
        }}
      />,
    )
    expect(screen.getByText('"a@example.com"')).toBeInTheDocument()
    expect(screen.getByText('redacted')).toBeInTheDocument()
    expect(screen.getByText(/File/)).toBeInTheDocument()
    expect(screen.getByText('city')).toBeInTheDocument()
    expect(screen.getByText('"NYC"')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('true')).toBeInTheDocument()
    expect(screen.getByText('null')).toBeInTheDocument()
  })
})

describe('Error panels', () => {
  it('renders field and root message cards', () => {
    render(<ErrorsMessagesPanel errors={{ email: 'Required' }} rootError="Form failed" />)
    expect(screen.getByText('email')).toBeInTheDocument()
    expect(screen.getByText('Required')).toBeInTheDocument()
    expect(screen.getByText('root')).toBeInTheDocument()
    expect(screen.getByText('Form failed')).toBeInTheDocument()
  })

  it('renders structured detail cards with issue lists', () => {
    render(
      <ErrorDetailsPanel
        errorDetails={{
          password: {
            message: 'Invalid',
            type: 'min',
            source: 'rule',
            issues: [
              { message: 'Too short', type: 'min', source: 'rule' },
              { message: 'Weak', type: 'custom', source: 'rule' },
            ],
          },
        }}
        rootErrorDetails={undefined}
      />,
    )
    expect(screen.getByText('password')).toBeInTheDocument()
    expect(screen.getByText('Too short')).toBeInTheDocument()
    expect(screen.getByText('Weak')).toBeInTheDocument()
    expect(screen.getAllByText('rule').length).toBeGreaterThan(0)
  })
})
