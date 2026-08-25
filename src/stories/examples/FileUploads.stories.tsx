import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileUploadForm } from '../../examples/FileUploadForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Examples/File uploads',
  component: FileUploadForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'Nested avatar File | null plus multiple documents. fileType / fileSize / minItems. Filename containing virus maps a nested backend error. Actions never include file bytes.',
          'FileUploadForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.fileInputs),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof FileUploadForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
