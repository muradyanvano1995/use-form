import type { Meta, StoryObj } from '@storybook/react-vite'
import { DependentFieldsForm } from '../../examples/DependentFieldsForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Examples/Dependencies',
  component: DependentFieldsForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'dependencies map revalidates confirmPassword and postalCode when sources change. Default dependencyMode is whenTouched.',
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

export const Default: Story = {}
