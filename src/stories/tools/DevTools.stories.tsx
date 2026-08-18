import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { DevToolsInspectorForm } from '../../examples/DevToolsInspectorForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Tools/DevTools',
  component: DevToolsInspectorForm,
  args: {
    position: 'inline',
    initiallyOpen: true,
  },
  argTypes: {
    position: {
      control: 'select',
      options: ['inline', 'bottom-left', 'bottom-right'],
      description: 'Use inline in docs and on mobile so the panel does not cover the form.',
    },
    initiallyOpen: { control: 'boolean' },
  },
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'Import FormDevTools from <package-name>/devtools. Passwords are redacted. File contents are never shown. CSS variables follow the preview theme with dark fallbacks.',
          'DevToolsInspectorForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.devtools),
    },
    viewport: { defaultViewport: 'desktop' },
  },
} satisfies Meta<typeof DevToolsInspectorForm>

export default meta
type Story = StoryObj<typeof meta>

export const InlineInspector: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Collapse' }))
    await expect(canvas.getByRole('button', { name: 'Expand' })).toBeVisible()
  },
}

export const MobileInline: Story = {
  args: { position: 'inline' },
  parameters: {
    viewport: { defaultViewport: 'smallMobile' },
    docs: {
      description: {
        story: 'Keep DevTools inline on small screens so it does not cover essential controls.',
      },
    },
  },
}
