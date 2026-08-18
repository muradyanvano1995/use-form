import type { Meta, StoryObj } from '@storybook/react-vite'
import { PasswordQualityForm } from '../examples/PasswordQualityForm.tsx'

const meta = {
  title: 'Examples/Structured errors',
  component: PasswordQualityForm,
} satisfies Meta<typeof PasswordQualityForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
