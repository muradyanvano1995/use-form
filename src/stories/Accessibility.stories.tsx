import type { Meta, StoryObj } from '@storybook/react-vite'
import { LoginForm } from '../examples/LoginForm.tsx'

const meta = {
  title: 'Examples/Accessibility',
  component: LoginForm,
  parameters: {
    docs: {
      description: {
        story:
          'Native fields expose stable ids, aria-invalid, and aria-describedby through register(). Focus-on-error is enabled by default.',
      },
    },
  },
} satisfies Meta<typeof LoginForm>

export default meta
type Story = StoryObj<typeof meta>

export const LabelsAndErrorIds: Story = {}
