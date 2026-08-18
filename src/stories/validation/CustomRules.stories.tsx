import type { Meta, StoryObj } from '@storybook/react-vite'
import { RegistrationForm } from '../../examples/RegistrationForm.tsx'

const meta = {
  title: 'Validation/Custom rules',
  component: RegistrationForm,
  parameters: {
    docs: {
      description: {
        component:
          'createRule builds a reusable sync rule. Here names containing “admin” fail. This is not the password-quality form (that story is Structured errors).',
      },
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof RegistrationForm>

export default meta
type Story = StoryObj<typeof meta>

export const CreateRule: Story = {}
