import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { RadioCheckboxGroupsForm } from '../../examples/RadioCheckboxGroupsForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Core Concepts/Registration',
  component: RadioCheckboxGroupsForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'register(name) returns name, id, onChange, onBlur, ref, aria-invalid, aria-describedby. Radios pass type and value; checkboxes bind booleans. File fields omit value. Custom widgets use useController instead. Login/email register lives under Hooks/useForm and Complete Examples/Login.',
          'RadioCheckboxGroupsForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.radioCheckbox),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof RadioCheckboxGroupsForm>

export default meta
type Story = StoryObj<typeof meta>

export const NativeRegister: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('radio', { name: /Phone/i }))
    await userEvent.click(canvas.getByRole('button', { name: 'Save preferences' }))
    await expect(canvas.getByRole('radio', { name: /Phone/i })).toBeChecked()
  },
}
