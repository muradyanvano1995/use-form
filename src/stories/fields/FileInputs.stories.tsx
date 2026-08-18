import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { FileUploadForm } from '../../examples/FileUploadForm.tsx'

const meta = {
  title: 'Fields/File inputs',
  component: FileUploadForm,
  parameters: {
    docs: {
      description: {
        component:
          'File identities only. JPEG/PNG avatar under 2MB, 1–3 documents. A filename containing virus maps a nested backend error. Actions must never include file bytes.',
      },
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof FileUploadForm>

export default meta
type Story = StoryObj<typeof meta>

export const UploadRules: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const avatar = canvas.getByLabelText('Profile image')
    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    await userEvent.upload(avatar, file)
    await userEvent.type(canvas.getByLabelText('Full name'), 'Ada')
    await userEvent.click(canvas.getByRole('button', { name: 'Upload' }))
    await expect(canvas.getByText(/Upload at least one document|Uploading/)).toBeTruthy()
  },
}
