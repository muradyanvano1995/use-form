import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { DevToolsInspectorForm } from '../../examples/DevToolsInspectorForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'DevTools',
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
          'Import FormDevTools from @muradyanvano/use-form/devtools. Passwords are redacted. File contents are never shown. The inspector uses a themed panel with status chips, section tabs, and a colorized value tree (`--form-devtools-*` tokens). Use Float to portal over the page; drag the header to move and the corner handle to resize. Dock returns inline.',
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
    const body = within(document.body)
    await userEvent.click(canvas.getByRole('button', { name: 'Float over page' }))
    await expect(canvas.queryByLabelText('Form DevTools')).toBeNull()
    await expect(body.getByLabelText('Form DevTools')).toHaveAttribute(
      'data-position',
      'bottom-right',
    )
    await userEvent.click(body.getByRole('button', { name: 'Dock inline' }))
    await expect(canvas.getByLabelText('Form DevTools')).toBeVisible()
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
