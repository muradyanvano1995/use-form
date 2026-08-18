import type { Meta, StoryObj } from '@storybook/react-vite'
import { LocalizedRegistrationForm } from '../examples/LocalizedRegistrationForm.tsx'

const meta = {
  title: 'Examples/Internationalization',
  component: LocalizedRegistrationForm,
} satisfies Meta<typeof LocalizedRegistrationForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
