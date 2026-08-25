import type { Meta, StoryObj } from '@storybook/react-vite'
import { RadioCheckboxGroupsForm } from '../../examples/RadioCheckboxGroupsForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Examples/Radio and checkboxes',
  component: RadioCheckboxGroupsForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'Radio group with shared name/error id and distinct option ids. Nested topic checkboxes. accepted / required rules.',
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

export const Default: Story = {}
