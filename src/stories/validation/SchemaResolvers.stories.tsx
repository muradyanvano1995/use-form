import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { ResolverRegistrationForm } from '../../examples/ResolverRegistrationForm.tsx'
import { StandardSchemaForm } from '../../examples/StandardSchemaForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Validation/Schema resolvers',
  component: StandardSchemaForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'Custom FormResolver vs standardSchemaResolver from the dedicated subpath. Resolvers run after rules/validate. Output types can differ from live input (age string → number).',
          'StandardSchemaForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.schemaResolver),
    },
  },
} satisfies Meta<typeof StandardSchemaForm>

export default meta
type Story = StoryObj<typeof meta>

export const CustomResolver: Story = {
  render: () => <ResolverRegistrationForm />,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Hand-written FormResolver with resolverContext.minimumAge. Emails ending in @blocked.test set a server error. Age stays a string in the form.',
      },
    },
  },
}

export const StandardSchema: Story = {
  args: { onSubmitSuccess: fn() },
  argTypes: {
    onSubmitSuccess: { action: 'submitSuccess' },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Create' }))
    await expect(canvas.getByText('Username is required')).toBeVisible()
    await userEvent.type(canvas.getByLabelText('Username'), 'ada')
    await userEvent.type(canvas.getByLabelText('Age'), '21')
    await userEvent.click(canvas.getByRole('button', { name: 'Create' }))
    await expect(args.onSubmitSuccess).toHaveBeenCalledWith({ username: 'ada', age: 21 })
  },
}
