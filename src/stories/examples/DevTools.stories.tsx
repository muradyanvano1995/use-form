import type { Meta, StoryObj } from '@storybook/react-vite'
import { DevToolsInspectorForm } from '../../examples/DevToolsInspectorForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Complete Examples/DevTools playground',
  component: DevToolsInspectorForm,
  args: {
    position: 'inline',
    initiallyOpen: true,
  },
  argTypes: {
    position: {
      control: 'select',
      options: ['inline', 'bottom-left', 'bottom-right'],
      description: 'Initial placement. Float/Dock still toggles at runtime.',
    },
    initiallyOpen: { control: 'boolean' },
  },
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'FormDevTools from the /devtools entry. Passwords redacted; files never expose contents. Float portals over the page with drag/resize.',
          'DevToolsInspectorForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.devtools),
    },
  },
} satisfies Meta<typeof DevToolsInspectorForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
