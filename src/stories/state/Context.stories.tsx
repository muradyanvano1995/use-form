import type { Meta, StoryObj } from '@storybook/react-vite'
import { ContextProfileForm } from '../../examples/ContextProfileForm.tsx'

const meta = {
  title: 'State and Performance/Context',
  component: ContextProfileForm,
  parameters: {
    docs: {
      description: {
        component:
          'FormProvider receives form.control only. Nested children call useController without prop-drilling. SubmitButton uses useFormState for isSubmitting.',
      },
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof ContextProfileForm>

export default meta
type Story = StoryObj<typeof meta>

export const Provider: Story = {}
