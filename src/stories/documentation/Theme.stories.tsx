import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Callout,
  CodePanel,
  DocsPage,
  ExampleShell,
  FeatureList,
  Kicker,
} from '../components/DocsUi.tsx'

function ThemeTokensDemo() {
  return (
    <ExampleShell
      title="Preview tokens"
      description="These surfaces read --docs-* variables. Switch the toolbar Theme control to light, dark, or system."
    >
      <div
        style={{
          display: 'grid',
          gap: 'var(--docs-space-3)',
          padding: 'var(--docs-space-4)',
          background: 'var(--docs-bg-elevated)',
          color: 'var(--docs-text)',
          border: '1px solid var(--docs-border)',
          borderRadius: 'var(--docs-radius)',
          boxShadow: 'var(--docs-shadow)',
          fontFamily: 'var(--docs-font)',
        }}
      >
        <p style={{ margin: 0, color: 'var(--docs-text-secondary)' }}>
          Canvas background comes from <code>var(--docs-bg-page)</code>. The backgrounds addon is
          disabled so it cannot fight the theme.
        </p>
        <label htmlFor="theme-demo-input" style={{ color: 'var(--docs-text)' }}>
          Sample field
        </label>
        <input
          id="theme-demo-input"
          placeholder="Uses --docs-input-* tokens"
          style={{
            minHeight: 'var(--docs-control-min-height)',
            padding: '0 var(--docs-space-2)',
            background: 'var(--docs-input-bg)',
            color: 'var(--docs-input-text)',
            border: '1px solid var(--docs-border)',
            borderRadius: 'var(--docs-radius-sm)',
            fontFamily: 'var(--docs-font)',
          }}
        />
        <div style={{ display: 'flex', gap: 'var(--docs-space-2)', flexWrap: 'wrap' }}>
          <button
            type="button"
            style={{
              minHeight: 'var(--docs-control-min-height)',
              padding: '0 var(--docs-space-3)',
              background: 'var(--docs-button-primary-bg)',
              color: 'var(--docs-button-primary-text)',
              border: 'none',
              borderRadius: 'var(--docs-radius-sm)',
            }}
          >
            Primary
          </button>
          <button
            type="button"
            style={{
              minHeight: 'var(--docs-control-min-height)',
              padding: '0 var(--docs-space-3)',
              background: 'var(--docs-button-secondary-bg)',
              color: 'var(--docs-button-secondary-text)',
              border: '1px solid var(--docs-button-secondary-border)',
              borderRadius: 'var(--docs-radius-sm)',
            }}
          >
            Secondary
          </button>
        </div>
        <p
          style={{
            margin: 0,
            padding: 'var(--docs-space-2)',
            background: 'var(--docs-error-bg)',
            color: 'var(--docs-error-text)',
            border: '1px solid var(--docs-error-border)',
            borderRadius: 'var(--docs-radius-sm)',
          }}
        >
          Error text uses <code>--docs-error-*</code>.
        </p>
      </div>
    </ExampleShell>
  )
}

function ThemePage() {
  return (
    <DocsPage>
      <Kicker>Storybook chrome</Kicker>
      <h1>Theme</h1>
      <p className="docs-lead">
        Documentation theming is three layers: manager chrome, preview toolbar +{' '}
        <code>data-theme</code>, and example CSS variables. The Vite demo <code>App.tsx</code> does
        not own Storybook colors.
      </p>

      <Callout tone="info" title="Controls">
        <p>
          Storybook Controls are empty because this page is static documentation. Use the toolbar
          Theme switcher (light, dark, system) instead of Controls or the backgrounds addon.
        </p>
      </Callout>

      <h2>Three layers</h2>
      <FeatureList
        items={[
          {
            title: 'Manager',
            body: 'addons.setConfig applies docsLightTheme or docsDarkTheme so the sidebar and toolbar follow the same mode.',
          },
          {
            title: 'Preview toolbar',
            body: 'Global theme is light | dark | system. The decorator writes data-theme on the document and the preview root.',
          },
          {
            title: 'Example tokens',
            body: 'Forms and docs UI use --docs-* variables from src/stories/styles/tokens.css. No App.tsx CSS.',
          },
        ]}
      />

      <h2>1. Manager themes</h2>
      <p>
        <code>.storybook/manager.ts</code> registers a small addon that reads the same global and
        calls <code>{'addons.setConfig({ theme })'}</code>. Light and dark manager themes live in{' '}
        <code>src/stories/theme/managerThemes.ts</code>.
      </p>
      <CodePanel
        title="Manager"
        code={`addons.setConfig({
  theme: resolved === 'dark' ? docsDarkTheme : docsLightTheme,
})`}
      />

      <h2>2. Preview global</h2>
      <p>
        <code>preview.ts</code> declares <code>globalTypes.theme</code> with toolbar items light,
        dark, and system. <code>withTheme</code> resolves the mode, sets <code>data-theme</code> on{' '}
        <code>documentElement</code> and <code>body</code>, and paints the canvas with{' '}
        <code>var(--docs-bg-page)</code>.
      </p>
      <CodePanel
        title="Toolbar global"
        code={`globalTypes: {
  theme: {
    toolbar: {
      items: [
        { value: 'light', title: 'Light' },
        { value: 'dark', title: 'Dark' },
        { value: 'system', title: 'System' },
      ],
    },
  },
}`}
      />

      <h2>System and listeners</h2>
      <p>
        System mode follows <code>prefers-color-scheme</code>. The preview decorator subscribes to
        the media query and removes the listener when the mode is no longer system or the story
        unmounts. Manager chrome uses the same media query while the global is system.
      </p>

      <h2>3. Example CSS variables</h2>
      <p>
        Tokens are scoped under <code>[data-theme='light']</code> and{' '}
        <code>[data-theme='dark']</code>. Examples should use these variables rather than hardcoded
        hex. Reduced-motion overrides also live in the token stylesheet.
      </p>
      <CodePanel
        title="Example usage"
        code={`.demo-form {
  background: var(--docs-bg-elevated);
  color: var(--docs-text);
  border: 1px solid var(--docs-border);
}

input {
  background: var(--docs-input-bg);
  color: var(--docs-input-text);
}`}
      />

      <h2>Backgrounds addon</h2>
      <p>
        Preview sets <code>parameters.backgrounds.disabled: true</code> because the theme owns the
        canvas. A second background picker would desync manager, docs, and form tokens.
      </p>

      <h2>Not App.tsx</h2>
      <p>
        <code>src/App.tsx</code> is the Vite demo. It imports example CSS for that app. Storybook
        loads <code>tokens.css</code> and <code>preview.css</code> from the preview decorator. Do
        not treat demo-app layout as the source of Storybook theming.
      </p>
    </DocsPage>
  )
}

const meta = {
  title: 'Theme',
  component: ThemePage,
  parameters: {
    layout: 'fullscreen',
    controls: {
      exclude: /./,
    },
    docs: {
      description: {
        component:
          'Storybook theming layers: manager themes via addons.setConfig, preview toolbar global theme (light|dark|system) with data-theme, and --docs-* CSS variables. Backgrounds are disabled because the theme owns the canvas. Controls are empty because this page is static documentation.',
      },
    },
  },
} satisfies Meta<typeof ThemePage>

export default meta
type Story = StoryObj<typeof meta>

export const Overview: Story = {}

export const TokenExamples: Story = {
  render: () => <ThemeTokensDemo />,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story:
          'Live surfaces bound to --docs-* variables. Change the toolbar Theme control to verify contrast.',
      },
    },
  },
}
