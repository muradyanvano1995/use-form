import type { Meta, StoryObj } from '@storybook/react-vite'
import { Callout, DocsPage, FeatureList, Kicker } from '../components/DocsUi.tsx'

function LimitationsPage() {
  return (
    <DocsPage>
      <Kicker>Honest scope</Kicker>
      <h1>Limitations and roadmap</h1>
      <p className="docs-lead">
        Local packaging is in place. This is not a published package, not a React Native library,
        and not a CommonJS build. The list below is current behavior, not a promise of future work.
      </p>

      <Callout tone="info" title="Controls">
        <p>
          Storybook Controls are empty because this page is static documentation, not a component
          playground.
        </p>
      </Callout>

      <Callout tone="warning" title="Unpublished">
        <p>
          <code>private: true</code> remains set. Workspace name <code>react-hooks</code> is
          generic. Owner blockers before any public 0.x: package name/scope, license, repository
          metadata, and CI provider. This page does not invent those choices.
        </p>
      </Callout>

      <h2>Platform and module format</h2>
      <FeatureList
        items={[
          {
            title: 'React 19 only',
            body: 'Peers are react ^19.0.0. React 18 is not claimed. Tests in this repo run on React 19.',
          },
          {
            title: 'ESM only',
            body: 'Package type is module. There is no tested CommonJS require() build.',
          },
          {
            title: 'No React Native',
            body: 'DOM registration, file inputs, and focus-on-error assume a browser document.',
          },
          {
            title: 'Client-only hooks',
            body: "Core and DevTools keep 'use client'. Do not call form hooks from Server Components.",
          },
        ]}
      />

      <h2>Path and array model</h2>
      <ul>
        <li>
          <code>FieldPath</code> recursion is capped at 5 nested object levels for compiler
          performance.
        </li>
        <li>
          Field arrays are one index level (<code>products.0.name</code>). Nested arrays inside
          items are unsupported.
        </li>
        <li>
          No wildcard paths. <code>products.*.name</code> rules and wildcard dependencies are not
          implemented. Use form-level <code>validate</code> for dynamic item rules. Exact indexed
          dependencies are positional after insert/remove/move.
        </li>
        <li>
          Parent object paths exist on <code>FieldPath</code>, but error/touched/dirty metadata is
          leaf-oriented.
        </li>
      </ul>

      <h2>Schema adapters</h2>
      <p>
        There is no first-party Zod, Yup, or Valibot adapter and those libraries are not core
        dependencies. Use a custom <code>FormResolver</code> or <code>standardSchemaResolver</code>{' '}
        from <code>{'<package-name>/resolvers/standard-schema'}</code> for Standard Schema
        v1-compatible schemas.
      </p>

      <h2>DevTools</h2>
      <p>
        <code>FormDevTools</code> is a read-only development inspector on a separate entry. It is
        not for production UI. Do not rely only on <code>import.meta.env.DEV</code>; omit the import
        or pass <code>{'enabled={false}'}</code>. The serializer is not a public export.
      </p>

      <h2>SSR</h2>
      <p>
        Store snapshots are SSR-safe enough for <code>useSyncExternalStore</code>, but form hooks
        still belong in Client Components. The resolver entry has no React import and can run on the
        server. There is no dedicated hydration test suite that claims full SSR forms.
      </p>

      <h2>Other deferred surfaces</h2>
      <ul>
        <li>
          No public <code>isRegistered</code> subscription API.
        </li>
        <li>
          No <code>toFormData</code> helper (multipart stays a consumer concern).
        </li>
        <li>No translation-library adapter. Catalogs cover built-in rules only.</li>
        <li>
          Unsupported mode names such as <code>onTouched</code> and <code>all</code> are omitted on
          purpose.
        </li>
        <li>
          The component that calls <code>useForm</code> still re-renders on any state change.
        </li>
        <li>Context generics are not runtime-verified.</li>
        <li>Storybook and TypeDoc output are local; they are not deployed from this repo.</li>
      </ul>

      <h2>Roadmap posture</h2>
      <p>
        Capability work for nested fields, arrays, resolvers, async defaults, unregister, structured
        errors, i18n catalogs, getters, batching, and local packaging is already in tree. Next
        publish steps are owner decisions, not agent work. Do not read this page as a schedule.
      </p>
    </DocsPage>
  )
}

const meta = {
  title: 'Limitations and roadmap',
  component: LimitationsPage,
  parameters: {
    layout: 'fullscreen',
    controls: {
      exclude: /./,
    },
    docs: {
      description: {
        component:
          'Honest current limits: unpublished, React 19 and ESM only, no React Native, path depth 5, one-level arrays, no wildcards, no first-party Zod adapter, client-only hooks, and DevTools that are not for production. Controls are empty because this page is static documentation.',
      },
    },
  },
} satisfies Meta<typeof LimitationsPage>

export default meta
type Story = StoryObj<typeof meta>

export const Overview: Story = {}
