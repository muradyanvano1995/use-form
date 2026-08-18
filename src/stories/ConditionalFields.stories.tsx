import type { Meta, StoryObj } from '@storybook/react-vite'
import { ConditionalCompanyForm } from '../examples/ConditionalCompanyForm.tsx'

const meta = {
  title: 'Examples/Conditional fields',
  component: ConditionalCompanyForm,
} satisfies Meta<typeof ConditionalCompanyForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
