import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { FieldStateForm } from '../../examples/FieldStateForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Hooks/useFieldState',
  component: FieldStateForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'useFieldState({ name }) subscribes to one field’s error, touched, dirty, and invalid flags. Prefer it over useFormState when you only need a single path. Distinct from useWatch, which reads values.',
          'FieldStateForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.fieldState),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof FieldStateForm>

export default meta
type Story = StoryObj<typeof meta>

export const FieldSlice: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText('Email'), 'ada')
    await userEvent.tab()
    await expect(canvas.getByText(/dirty=true/)).toBeVisible()
    await expect(canvas.getByRole('alert')).toHaveTextContent('Enter a valid email address')
  },
}
