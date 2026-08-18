import type { Meta, StoryObj } from '@storybook/react-vite'
import { rules, useForm, ValidationMode } from '../lib/index.ts'

function GettingStarted() {
  const form = useForm({
    defaultValues: { email: '' },
    mode: ValidationMode.OnSubmit,
    rules: {
      email: [rules.required('Email is required'), rules.email()],
    },
    onSubmit: (values) => {
      void values
    },
  })

  return (
    <form onSubmit={form.handleSubmit} noValidate>
      <label htmlFor={form.getFieldId('email')}>Email</label>
      <input {...form.register('email')} autoComplete="email" />
      {form.errors.email ? <p id={form.getErrorId('email')}>{form.errors.email}</p> : null}
      <button type="submit">Continue</button>
    </form>
  )
}

const meta = {
  title: 'Documentation/Getting started',
  component: GettingStarted,
} satisfies Meta<typeof GettingStarted>

export default meta
type Story = StoryObj<typeof meta>

export const EmailField: Story = {}
