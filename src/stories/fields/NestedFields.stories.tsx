import type { Meta, StoryObj } from '@storybook/react-vite'
import { ProfileForm } from '../../examples/ProfileForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Fields/Nested fields',
  component: ProfileForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'Dot paths: personal.firstName, address.city. Try city forbidden for a nested backend error. resetField("address.city") is on the form.',
          'ProfileForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.nestedFields),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof ProfileForm>

export default meta
type Story = StoryObj<typeof meta>

export const NestedProfile: Story = {}
