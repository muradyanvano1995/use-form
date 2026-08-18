import type { Meta, StoryObj } from '@storybook/react-vite'
import { DevToolsInspectorForm } from '../examples/DevToolsInspectorForm.tsx'

const meta = {
  title: 'Examples/DevTools',
  component: DevToolsInspectorForm,
} satisfies Meta<typeof DevToolsInspectorForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
