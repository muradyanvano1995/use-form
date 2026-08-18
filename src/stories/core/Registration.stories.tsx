import type { Meta, StoryObj } from '@storybook/react-vite'
import { LoginForm } from '../../examples/LoginForm.tsx'

const meta = {
  title: 'Core Concepts/Registration',
  component: LoginForm,
  parameters: {
    docs: {
      description: {
        component:
          'register(name) returns name, id, onChange, onBlur, ref, aria-invalid, aria-describedby. File fields omit value. Radios pass type and value. This is the native-control path; custom widgets use useController instead.',
      },
      source: {
        code: `const email = form.register('email')
<input {...email} type="email" autoComplete="email" />`,
      },
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof LoginForm>

export default meta
type Story = StoryObj<typeof meta>

export const NativeRegister: Story = {}
