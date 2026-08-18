import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileUploadForm } from '../examples/FileUploadForm.tsx'

const meta = {
  title: 'Examples/File upload',
  component: FileUploadForm,
} satisfies Meta<typeof FileUploadForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
