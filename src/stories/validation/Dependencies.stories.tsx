import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { DependentFieldsForm } from '../../examples/DependentFieldsForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Validation/Dependencies',
  component: DependentFieldsForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'dependencies: confirmPassword → password, postalCode → country. Touch the dependent, then change the source. CA postal codes in this demo must start with H.',
          'DependentFieldsForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.dependencies),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof DependentFieldsForm>

export default meta
type Story = StoryObj<typeof meta>

export const PasswordAndPostal: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText('Password'), 'alpha')
    await userEvent.type(canvas.getByLabelText('Confirm password'), 'beta')
    await userEvent.click(canvas.getByRole('button', { name: 'Validate form' }))
    await expect(canvas.getByText('Passwords must match')).toBeVisible()
    await userEvent.clear(canvas.getByLabelText('Password'))
    await userEvent.type(canvas.getByLabelText('Password'), 'beta')
    await expect(canvas.getByText('Passwords must match')).not.toBeInTheDocument()
  },
}
