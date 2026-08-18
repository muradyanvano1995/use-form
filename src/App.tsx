import { AsyncDefaultsProfileForm } from './examples/AsyncDefaultsProfileForm.tsx'
import { BatchedAddressForm } from './examples/BatchedAddressForm.tsx'
import { ConditionalCompanyForm } from './examples/ConditionalCompanyForm.tsx'
import { ContextProfileForm } from './examples/ContextProfileForm.tsx'
import { ControlledFieldsForm } from './examples/ControlledFieldsForm.tsx'
import { DependentFieldsForm } from './examples/DependentFieldsForm.tsx'
import { DevToolsInspectorForm } from './examples/DevToolsInspectorForm.tsx'
import { FileUploadForm } from './examples/FileUploadForm.tsx'
import { LocalizedRegistrationForm } from './examples/LocalizedRegistrationForm.tsx'
import { LoginForm } from './examples/LoginForm.tsx'
import { OrderItemsForm } from './examples/OrderItemsForm.tsx'
import { PasswordQualityForm } from './examples/PasswordQualityForm.tsx'
import { ProfileForm } from './examples/ProfileForm.tsx'
import { RegistrationForm } from './examples/RegistrationForm.tsx'
import { ResolverRegistrationForm } from './examples/ResolverRegistrationForm.tsx'
import { UsernameAvailabilityForm } from './examples/UsernameAvailabilityForm.tsx'
import './examples/examples.css'

function App() {
  return (
    <main className="demo-page">
      <div className="demo-page__intro">
        <h1>useForm examples</h1>
        <p>
          Production-style demos of the shared form hook: typed fields, nested paths, field arrays,
          schema resolvers, dependent fields, debounced async checks, async default values,
          conditional fields, structured errors, localized validation messages, file uploads,
          controlled custom components, form context, validation timing, async submit, backend error
          mapping, accessible error messaging, imperative getters, atomic batching, and a
          development-only inspector.
        </p>
      </div>
      <div className="demo-page__grid">
        <LoginForm />
        <RegistrationForm />
        <LocalizedRegistrationForm />
        <ProfileForm />
        <AsyncDefaultsProfileForm />
        <ConditionalCompanyForm />
        <UsernameAvailabilityForm />
        <FileUploadForm />
        <ControlledFieldsForm />
        <DependentFieldsForm />
        <ContextProfileForm />
        <OrderItemsForm />
        <PasswordQualityForm />
        <ResolverRegistrationForm />
        <BatchedAddressForm />
        <DevToolsInspectorForm />
      </div>
    </main>
  )
}

export default App
