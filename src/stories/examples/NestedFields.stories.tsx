import type { Meta, StoryObj } from '@storybook/react-vite'
import { ProfileForm } from '../../examples/ProfileForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Examples/Nested fields',
  component: ProfileForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'Nested personal/address paths, newsletter checkbox, city `forbidden` backend error, and resetField("address.city").',
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

export const Default: Story = {}
