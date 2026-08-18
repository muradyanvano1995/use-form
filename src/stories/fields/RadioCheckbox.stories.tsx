import type { Meta, StoryObj } from '@storybook/react-vite'
import { RadioCheckboxGroupsForm } from '../../examples/RadioCheckboxGroupsForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Fields/Radio and checkbox groups',
  component: RadioCheckboxGroupsForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'Radio groups share a register name with type radio and value. Checkboxes are booleans. Both use fieldset/legend.',
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

export const Groups: Story = {}
