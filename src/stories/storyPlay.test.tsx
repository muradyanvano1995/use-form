import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LoginForm } from '../examples/LoginForm.tsx'
import { UsernameAvailabilityForm } from '../examples/UsernameAvailabilityForm.tsx'
import { ConditionalFieldsDemo } from '../examples/ConditionalCompanyForm.tsx'
import { AsyncDefaultsProfileForm } from '../examples/AsyncDefaultsProfileForm.tsx'
import { StandardSchemaForm } from '../examples/StandardSchemaForm.tsx'
import { FieldStateForm } from '../examples/FieldStateForm.tsx'
import { ImperativeApiForm } from '../examples/ImperativeApiForm.tsx'

describe('documentation example flows', () => {
  it('login: required, invalid email, success, and reset', async () => {
    const user = userEvent.setup()
    const onSubmitSuccess = vi.fn()
    const onSubmitInvalid = vi.fn()
    const onReset = vi.fn()
    render(
      <LoginForm
        onSubmitSuccess={onSubmitSuccess}
        onSubmitInvalid={onSubmitInvalid}
        onReset={onReset}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByText('Email is required')).toBeVisible()
    expect(screen.getByLabelText('Email')).toHaveFocus()
    expect(onSubmitInvalid).toHaveBeenCalled()

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByText('Enter a valid email address')).toBeVisible()

    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret1')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(onSubmitSuccess).toHaveBeenCalled())
    expect(screen.getByRole('status')).toHaveTextContent(/Signed in/)

    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(onReset).toHaveBeenCalled()
  })

  it('async username: blur skips debounce for taken names', async () => {
    const user = userEvent.setup()
    render(<UsernameAvailabilityForm />)
    await user.type(screen.getByLabelText('Username'), 'admin')
    await user.tab()
    await waitFor(() => expect(screen.getByText('Username is already taken')).toBeVisible())
  })

  it('conditional fields unmount company controls', async () => {
    const user = userEvent.setup()
    render(<ConditionalFieldsDemo shouldUnregister />)
    await user.click(screen.getByRole('radio', { name: 'Company' }))
    expect(screen.getByLabelText('Company name')).toBeVisible()
    await user.click(screen.getByRole('radio', { name: 'Personal' }))
    expect(screen.queryByLabelText('Company name')).not.toBeInTheDocument()
  })

  it('async defaults load Server Name', async () => {
    const onLoaded = vi.fn()
    render(<AsyncDefaultsProfileForm onLoaded={onLoaded} />)
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Server Name'))
    expect(onLoaded).toHaveBeenCalledWith({ name: 'Server Name' })
  })

  it('standard schema transforms age to a number', async () => {
    const user = userEvent.setup()
    const onSubmitSuccess = vi.fn()
    render(<StandardSchemaForm onSubmitSuccess={onSubmitSuccess} />)
    await user.type(screen.getByLabelText('Username'), 'ada')
    await user.type(screen.getByLabelText('Age'), '21')
    await user.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(onSubmitSuccess).toHaveBeenCalledWith({ username: 'ada', age: 21 }))
  })

  it('useFieldState child shows dirty and invalid email', async () => {
    const user = userEvent.setup()
    render(<FieldStateForm />)
    await user.type(screen.getByLabelText('Email'), 'ada')
    await user.tab()
    expect(screen.getByText(/dirty=true/)).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address')
  })

  it('imperative validateField and clearError', async () => {
    const user = userEvent.setup()
    render(<ImperativeApiForm />)
    await user.click(screen.getByRole('button', { name: 'Validate email' }))
    expect(screen.getByText('Email is required')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'clearError email' }))
    expect(screen.queryByText('Email is required')).not.toBeInTheDocument()
  })
})
