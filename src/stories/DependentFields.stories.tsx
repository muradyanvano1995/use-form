import type { Meta, StoryObj } from '@storybook/react-vite'
import { DependentFieldsForm } from '../examples/DependentFieldsForm.tsx'

const meta = {
  title: 'Examples/Dependent fields',
  component: DependentFieldsForm,
} satisfies Meta<typeof DependentFieldsForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
