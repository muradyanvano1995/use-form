import type { Meta, StoryObj } from '@storybook/react-vite'
import { ProfileForm } from '../../examples/ProfileForm.tsx'

const meta = {
  title: 'Fields/Nested fields',
  component: ProfileForm,
  parameters: {
    docs: {
      description: {
        component:
          'Dot paths: personal.firstName, address.city. Try city forbidden for a nested backend error. resetField("address.city") is on the form.',
      },
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof ProfileForm>

export default meta
type Story = StoryObj<typeof meta>

export const NestedProfile: Story = {}
