import type { Meta, StoryObj } from '@storybook/react-vite'
import { AsyncDefaultsProfileForm } from '../../examples/AsyncDefaultsProfileForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Complete Examples/Async profile defaults',
  component: AsyncDefaultsProfileForm,
  args: {
    loadOutcome: 'success',
  },
  argTypes: {
    loadOutcome: {
      control: 'radio',
      options: ['success', 'failure'],
      description: 'Deterministic loader result (350ms).',
    },
  },
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'Sync defaultValues plus loadDefaultValues. isLoadingDefaults / isDefaultsReady / reloadDefaultValues. preserveDirty merge.',
          'AsyncDefaultsProfileForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.asyncDefaults),
    },
  },
} satisfies Meta<typeof AsyncDefaultsProfileForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
