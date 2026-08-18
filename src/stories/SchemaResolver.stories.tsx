import type { Meta, StoryObj } from '@storybook/react-vite'
import { ResolverRegistrationForm } from '../examples/ResolverRegistrationForm.tsx'

const meta = {
  title: 'Examples/Schema resolver',
  component: ResolverRegistrationForm,
} satisfies Meta<typeof ResolverRegistrationForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
