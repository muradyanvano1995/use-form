import { useEffect, useRef, useState } from 'react'
import {
  rules,
  useForm,
  ValidationMode,
  type FieldLabels,
  type ValidationMessageCatalog,
} from '../hooks/useForm'
import './examples.css'

type RegistrationValues = {
  name: string
  email: string
  password: string
  age: number
}

type Locale = 'en' | 'hy'

const defaultValues: RegistrationValues = {
  name: '',
  email: '',
  password: '',
  age: 16,
}

const englishLabels: FieldLabels<RegistrationValues> = {
  name: 'Full name',
  email: 'Email address',
  password: 'Password',
  age: 'Age',
}

const armenianLabels: FieldLabels<RegistrationValues> = {
  name: 'Անուն',
  email: 'Էլ․ հասցե',
  password: 'Գաղտնաբառ',
  age: 'Տարիք',
}

const englishMessages = {
  required: ({ label }) => `${label} is required`,
  email: ({ label }) => `${label} must be a valid email`,
  minLength: ({ label, params }) => `${label} must contain at least ${params.min} characters`,
  min: ({ label, params }) => `${label} must be at least ${params.min}`,
} satisfies ValidationMessageCatalog<RegistrationValues>

const armenianMessages = {
  required: ({ label }) => `${label} դաշտը պարտադիր է`,
  email: ({ label }) => `${label} դաշտում նշեք վավեր էլ․ հասցե`,
  minLength: ({ label, params }) => `${label} դաշտը պետք է պարունակի առնվազն ${params.min} նիշ`,
  min: ({ label, params }) => `${label} դաշտը պետք է լինի առնվազն ${params.min}`,
} satisfies ValidationMessageCatalog<RegistrationValues>

const copy = {
  en: {
    title: 'Localized registration',
    description:
      'Message catalogs and field labels. Switching language refreshes visible errors after the new catalog commits. A pristine form is not validated. No translation library is required.',
    language: 'Language',
    submit: 'Validate and submit',
    success: 'Registration accepted.',
    passwordRule: ({ label, params }: { label: string; params: { min: number } }) =>
      `${label}: use at least ${params.min} characters (per-rule override)`,
  },
  hy: {
    title: 'Տեղայնացված գրանցում',
    description:
      'Հաղորդագրությունների ցանկեր և դաշտերի պիտակներ։ Լեզուն փոխելիս տեսանելի սխալները թարմացվում են նոր ցանկը կիրառելուց հետո։ Դատարկ ձևը չի ստուգվում։ Թարգմանության գրադարան պետք չէ։',
    language: 'Լեզու',
    submit: 'Ստուգել և ուղարկել',
    success: 'Գրանցումն ընդունվեց։',
    passwordRule: ({ label, params }: { label: string; params: { min: number } }) =>
      `${label}՝ առնվազն ${params.min} նիշ (կանոնի հաղորդագրություն)`,
  },
} as const

function hasVisibleErrors(errors: Record<string, string | undefined>, rootError?: string): boolean {
  if (rootError) {
    return true
  }
  return Object.values(errors).some(Boolean)
}

export type LocalizedRegistrationFormProps = {
  locale?: Locale
  onLocaleChange?: (locale: Locale) => void
}

export function LocalizedRegistrationForm({
  locale: localeProp,
  onLocaleChange,
}: LocalizedRegistrationFormProps = {}) {
  const [internalLocale, setInternalLocale] = useState<Locale>(localeProp ?? 'en')
  const locale = localeProp ?? internalLocale
  const strings = copy[locale]
  const [statusMessage, setStatusMessage] = useState<string | undefined>()
  const skipFirstLocaleEffectRef = useRef(true)
  const localeGenerationRef = useRef(0)

  const form = useForm<RegistrationValues>({
    id: 'localized-registration',
    defaultValues,
    criteriaMode: 'all',
    mode: ValidationMode.OnSubmit,
    focusOnError: false,
    fieldLabels: locale === 'hy' ? armenianLabels : englishLabels,
    validationMessages: locale === 'hy' ? armenianMessages : englishMessages,
    rules: {
      name: [rules.required(), rules.minLength(2)],
      email: [rules.required(), rules.email()],
      password: [rules.required(), rules.minLength(8, strings.passwordRule)],
      age: [rules.min(18)],
    },
    onSubmit: () => {
      setStatusMessage(copy[locale].success)
    },
  })

  useEffect(() => {
    if (skipFirstLocaleEffectRef.current) {
      skipFirstLocaleEffectRef.current = false
      return
    }

    const generation = ++localeGenerationRef.current
    setStatusMessage((current) => (current ? copy[locale].success : current))

    if (!hasVisibleErrors(form.errors, form.rootError)) {
      return
    }

    void form.validate().then(() => {
      if (generation !== localeGenerationRef.current) {
        return
      }
    })
    // Only the committed locale should retrigger this. Listing form.errors would
    // revalidate after every error write and can loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- catalog commit, not error writes
  }, [locale])

  const passwordIssues = form.errorDetails.password?.issues ?? []
  const passwordErrorId = form.getErrorId('password')
  const labels = locale === 'hy' ? armenianLabels : englishLabels

  return (
    <form className="demo-form" onSubmit={form.handleSubmit} noValidate>
      <header className="demo-form__header">
        <h2>{strings.title}</h2>
        <p>{strings.description}</p>
      </header>

      <fieldset className="demo-form__field">
        <legend>{strings.language}</legend>
        <label>
          <input
            type="radio"
            name="localized-locale"
            checked={locale === 'en'}
            onChange={() => {
              setInternalLocale('en')
              onLocaleChange?.('en')
            }}
          />
          English
        </label>
        <label>
          <input
            type="radio"
            name="localized-locale"
            checked={locale === 'hy'}
            onChange={() => {
              setInternalLocale('hy')
              onLocaleChange?.('hy')
            }}
          />
          Հայերեն
        </label>
      </fieldset>

      <label className="demo-form__field">
        {labels.name}
        <input {...form.register('name')} autoComplete="name" />
        {form.errors.name ? <p className="demo-form__error">{form.errors.name}</p> : null}
      </label>

      <label className="demo-form__field">
        {labels.email}
        <input {...form.register('email')} type="email" autoComplete="email" />
        {form.errors.email ? <p className="demo-form__error">{form.errors.email}</p> : null}
      </label>

      <label className="demo-form__field">
        {labels.password}
        <input
          {...form.register('password')}
          type="password"
          autoComplete="new-password"
          aria-describedby={passwordIssues.length > 0 ? passwordErrorId : undefined}
        />
        {passwordIssues.length > 0 ? (
          <ul id={passwordErrorId} className="demo-form__error">
            {passwordIssues.map((issue) => (
              <li key={`${issue.type}-${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        ) : null}
      </label>

      <label className="demo-form__field">
        {labels.age}
        <input {...form.register('age', { valueAsNumber: true })} type="number" />
        {form.errors.age ? <p className="demo-form__error">{form.errors.age}</p> : null}
      </label>

      {statusMessage ? (
        <p className="demo-form__status" role="status">
          {statusMessage}
        </p>
      ) : null}

      <div className="demo-form__actions">
        <button type="submit" disabled={form.isSubmitting}>
          {strings.submit}
        </button>
      </div>
    </form>
  )
}
