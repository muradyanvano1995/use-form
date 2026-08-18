import type { Meta, StoryObj } from '@storybook/react-vite'

function Introduction() {
  return (
    <article className="demo-page__intro">
      <h1>Form hooks</h1>
      <p>
        Typed React form state with nested fields, field arrays, validation, files, and a separate
        DevTools entry. This Storybook workspace is local documentation only. It is not part of the
        npm package and is not deployed.
      </p>
      <p>
        The published package name is not final. Install with{' '}
        <code>npm install &lt;package-name&gt;</code> after the owner chooses a public name. React
        19 is required. Form hooks are client-side APIs.
      </p>
    </article>
  )
}

const meta = {
  title: 'Documentation/Introduction',
  component: Introduction,
} satisfies Meta<typeof Introduction>

export default meta
type Story = StoryObj<typeof meta>

export const Overview: Story = {}
