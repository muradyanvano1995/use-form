import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LocalizedRegistrationForm } from './LocalizedRegistrationForm.tsx'

async function submitEmpty(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Validate and submit' }))
  await waitFor(() => expect(screen.getByText('Full name is required')).toBeVisible())
}

describe('LocalizedRegistrationForm', () => {
  it('does not create errors when switching locale on a pristine form', async () => {
    const user = userEvent.setup()
    render(<LocalizedRegistrationForm />)
    await user.click(screen.getByRole('radio', { name: 'Հայերեն' }))
    expect(screen.queryByText(/is required|պարտադիր է/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ստուգել և ուղարկել' })).toBeVisible()
  })

  it('rewrites English errors to Armenian after a locale switch', async () => {
    const user = userEvent.setup()
    render(<LocalizedRegistrationForm />)
    await submitEmpty(user)
    await user.click(screen.getByRole('radio', { name: 'Հայերեն' }))
    await waitFor(() => expect(screen.getByText('Անուն դաշտը պարտադիր է')).toBeVisible())
    expect(screen.queryByText('Full name is required')).not.toBeInTheDocument()
  })

  it('rewrites Armenian errors to English after a locale switch', async () => {
    const user = userEvent.setup()
    render(<LocalizedRegistrationForm />)
    await submitEmpty(user)
    await user.click(screen.getByRole('radio', { name: 'Հայերեն' }))
    await waitFor(() => expect(screen.getByText('Անուն դաշտը պարտադիր է')).toBeVisible())
    await user.click(screen.getByRole('radio', { name: 'English' }))
    await waitFor(() => expect(screen.getByText('Full name is required')).toBeVisible())
    expect(screen.queryByText('Անուն դաշտը պարտադիր է')).not.toBeInTheDocument()
  })

  it('preserves current values, dirty state, and touched state across locale changes', async () => {
    const user = userEvent.setup()
    render(<LocalizedRegistrationForm />)
    await user.type(screen.getByLabelText('Full name'), 'Ada')
    await user.type(screen.getByLabelText('Email address'), 'ada@example.com')
    await user.click(screen.getByRole('button', { name: 'Validate and submit' }))
    await waitFor(() => expect(screen.getByText('Password is required')).toBeVisible())
    expect(screen.getByLabelText('Full name')).toHaveValue('Ada')
    expect(screen.getByLabelText('Email address')).toHaveValue('ada@example.com')

    await user.click(screen.getByRole('radio', { name: 'Հայերեն' }))
    await waitFor(() => expect(screen.getByLabelText('Անուն')).toHaveValue('Ada'))
    expect(screen.getByLabelText('Էլ․ հասցե')).toHaveValue('ada@example.com')
    expect(screen.queryByText(/Անուն դաշտը պարտադիր է/)).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/Գաղտնաբառ դաշտը պարտադիր է/)).toBeVisible())
  })

  it('translates an existing success status instead of leaving the previous language', async () => {
    const user = userEvent.setup()
    render(<LocalizedRegistrationForm />)
    await user.type(screen.getByLabelText('Full name'), 'Ada')
    await user.type(screen.getByLabelText('Email address'), 'ada@example.com')
    await user.type(screen.getByLabelText('Password'), 'password1')
    await user.clear(screen.getByLabelText('Age'))
    await user.type(screen.getByLabelText('Age'), '21')
    await user.click(screen.getByRole('button', { name: 'Validate and submit' }))
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Registration accepted.'),
    )

    await user.click(screen.getByRole('radio', { name: 'Հայերեն' }))
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Գրանցումն ընդունվեց։'),
    )
    expect(screen.queryByText('Registration accepted.')).not.toBeInTheDocument()
  })

  it('leaves messages in the final locale after rapid switching', async () => {
    const user = userEvent.setup()
    const onLocaleChange = vi.fn()
    render(<LocalizedRegistrationForm onLocaleChange={onLocaleChange} />)
    await submitEmpty(user)
    await user.click(screen.getByRole('radio', { name: 'Հայերեն' }))
    await user.click(screen.getByRole('radio', { name: 'English' }))
    await user.click(screen.getByRole('radio', { name: 'Հայերեն' }))
    expect(onLocaleChange).toHaveBeenLastCalledWith('hy')
    await waitFor(() => expect(screen.getByText('Անուն դաշտը պարտադիր է')).toBeVisible())
    expect(screen.queryByText('Full name is required')).not.toBeInTheDocument()
  })
})
