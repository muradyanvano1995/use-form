import { act, renderHook, waitFor } from '@testing-library/react'
import { StrictMode, type ChangeEvent } from 'react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { useForm } from './useForm.ts'
import { ReValidateMode, ValidationMode } from './validation/modes.ts'
import { createRule, rules } from './validation/index.ts'
import * as formUtilities from './utilities.ts'
import type { FieldErrors } from './formTypes.ts'
import type { FieldLabels, ValidationMessageCatalog } from './validation/validationMessages.ts'

type LoginForm = {
  email: string
  password: string
  rememberMe: boolean
}

type RegistrationForm = {
  name: string
  email: string
  password: string
  confirmPassword: string
  age: number
  acceptTerms: boolean
}

type MixedForm = {
  email: string
  age: number
  plan: string
  rememberMe: boolean
  notes: string
}

const loginDefaults: LoginForm = {
  email: '',
  password: '',
  rememberMe: false,
}

const registrationDefaults: RegistrationForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  age: 18,
  acceptTerms: false,
}

const mixedDefaults: MixedForm = {
  email: '',
  age: 18,
  plan: 'basic',
  rememberMe: false,
  notes: '',
}

type ProfileForm = {
  personal: { firstName: string; lastName: string }
  address: { city: string; postalCode: string }
  preferences: { newsletter: boolean; plan: string }
  age: number
}

const profileDefaults: ProfileForm = {
  personal: { firstName: '', lastName: '' },
  address: { city: '', postalCode: '' },
  preferences: { newsletter: false, plan: 'basic' },
  age: 18,
}

type FileForm = {
  name: string
  avatar: File | null
  documents: File[]
  profile: { avatar: File | null }
}

const fileDefaults: FileForm = {
  name: '',
  avatar: null,
  documents: [],
  profile: { avatar: null },
}

function createTestFile(name = 'avatar.png', type = 'image/png', content = 'hello'): File {
  return new File([content], name, { type })
}

function asChangeEvent(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
): ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> {
  return { target: element } as ChangeEvent<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >
}

function attachFiles(input: HTMLInputElement, files: File[] | null): void {
  if (files === null) {
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: null,
    })
    return
  }

  Object.defineProperty(input, 'files', {
    configurable: true,
    value: {
      ...Object.fromEntries(files.map((file, index) => [index, file])),
      length: files.length,
      item: (i: number) => files[i] ?? null,
      [Symbol.iterator]: function* () {
        yield* files
      },
    },
  })
}

describe('useForm', () => {
  describe('initialization', () => {
    it('initializes from default values without mutating the source', () => {
      const source = { ...loginDefaults }
      const { result } = renderHook(() =>
        useForm<LoginForm>({
          defaultValues: source,
        }),
      )

      expect(result.current.values).toEqual(loginDefaults)
      expect(result.current.defaultValues).toEqual(loginDefaults)
      expect(result.current.values).not.toBe(source)
      expect(result.current.defaultValues).not.toBe(source)

      act(() => {
        result.current.setValue('email', 'a@b.com')
      })

      expect(source.email).toBe('')
      expect(result.current.values.email).toBe('a@b.com')
    })

    it('does not silently reset when the parent re-renders with new defaultValues identity', () => {
      const { result, rerender } = renderHook(
        ({ defaults }) =>
          useForm<LoginForm>({
            defaultValues: defaults,
          }),
        { initialProps: { defaults: loginDefaults } },
      )

      act(() => {
        result.current.setValue('email', 'kept@example.com')
      })

      rerender({
        defaults: { email: 'server@example.com', password: '', rememberMe: false },
      })

      expect(result.current.values.email).toBe('kept@example.com')
    })

    it('works under Strict Mode', async () => {
      const onSubmit = vi.fn()
      const { result } = renderHook(
        () =>
          useForm<LoginForm>({
            defaultValues: { ...loginDefaults, email: 'a@b.com', password: 'secret' },
            onSubmit,
          }),
        { wrapper: StrictMode },
      )

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(result.current.isSubmitting).toBe(false)
    })
  })

  describe('field registration', () => {
    it('binds checkbox checked state through register', () => {
      const { result } = renderHook(() =>
        useForm<LoginForm>({
          defaultValues: loginDefaults,
        }),
      )

      const unchecked = result.current.register('rememberMe')
      expect(unchecked.checked).toBe(false)
      expect(unchecked.value).toBeUndefined()

      act(() => {
        result.current.setValue('rememberMe', true)
      })

      const checked = result.current.register('rememberMe')
      expect(checked.checked).toBe(true)
    })

    it('parses checkbox, radio, number, trim, and setValueAs through register', () => {
      const { result } = renderHook(() =>
        useForm<MixedForm>({
          defaultValues: mixedDefaults,
        }),
      )

      const checkboxInput = document.createElement('input')
      checkboxInput.type = 'checkbox'
      checkboxInput.checked = true
      act(() => {
        result.current.register('rememberMe').onChange(asChangeEvent(checkboxInput))
      })
      expect(result.current.values.rememberMe).toBe(true)

      const radioProps = result.current.register('plan', { type: 'radio', value: 'pro' })
      expect(radioProps.checked).toBe(false)
      const radioInput = document.createElement('input')
      radioInput.type = 'radio'
      radioInput.value = 'pro'
      radioInput.checked = true
      act(() => {
        radioProps.onChange(asChangeEvent(radioInput))
      })
      expect(result.current.values.plan).toBe('pro')
      expect(result.current.register('plan', { type: 'radio', value: 'pro' }).checked).toBe(true)

      const ageInput = document.createElement('input')
      ageInput.type = 'number'
      ageInput.value = '42'
      act(() => {
        result.current.register('age', { valueAsNumber: true }).onChange(asChangeEvent(ageInput))
      })
      expect(result.current.values.age).toBe(42)

      ageInput.value = ''
      act(() => {
        result.current.register('age', { valueAsNumber: true }).onChange(asChangeEvent(ageInput))
      })
      expect(Number.isNaN(result.current.values.age)).toBe(true)

      const notesInput = document.createElement('input')
      notesInput.type = 'text'
      notesInput.value = '  hello  '
      act(() => {
        result.current.register('notes', { trim: true }).onChange(asChangeEvent(notesInput))
      })
      expect(result.current.values.notes).toBe('hello')

      const emailInput = document.createElement('input')
      emailInput.type = 'email'
      emailInput.value = 'a@b.com'
      act(() => {
        result.current
          .register('email', { setValueAs: (raw) => String(raw).toUpperCase() })
          .onChange(asChangeEvent(emailInput))
      })
      expect(result.current.values.email).toBe('A@B.COM')
    })

    it('parses number from select and radio without an explicit value', () => {
      const { result } = renderHook(() =>
        useForm<MixedForm>({
          defaultValues: mixedDefaults,
        }),
      )

      const select = document.createElement('select')
      const option = document.createElement('option')
      option.value = '33'
      select.appendChild(option)
      select.value = '33'
      act(() => {
        result.current.register('age', { type: 'number' }).onChange(asChangeEvent(select))
      })
      expect(result.current.values.age).toBe(33)

      const radioWithoutValue = result.current.register('plan', { type: 'radio' })
      expect(radioWithoutValue.checked).toBe(false)
      expect(radioWithoutValue.value).toBeUndefined()

      const radioInput = document.createElement('input')
      radioInput.type = 'radio'
      radioInput.value = 'basic'
      radioInput.checked = true
      act(() => {
        radioWithoutValue.onChange(asChangeEvent(radioInput))
      })
      expect(result.current.values.plan).toBe('basic')
    })

    it('skips trim when the incoming value is not a string', () => {
      const { result } = renderHook(() =>
        useForm<MixedForm>({
          defaultValues: mixedDefaults,
        }),
      )

      act(() => {
        result.current.register('notes', { trim: true }).onChange({
          target: { value: 42 },
        } as never)
      })

      expect(result.current.values.notes).toBe(42)
    })

    it('uses setValueAs with checkbox targets and falls through mismatched control types', () => {
      const { result } = renderHook(() =>
        useForm<MixedForm>({
          defaultValues: mixedDefaults,
        }),
      )

      const checkboxInput = document.createElement('input')
      checkboxInput.type = 'checkbox'
      checkboxInput.checked = true
      act(() => {
        result.current
          .register('rememberMe', { setValueAs: (raw) => Boolean(raw) })
          .onChange(asChangeEvent(checkboxInput))
      })
      expect(result.current.values.rememberMe).toBe(true)

      const textInput = document.createElement('input')
      textInput.type = 'text'
      textInput.value = 'ignored'
      act(() => {
        result.current.register('rememberMe').onChange(asChangeEvent(textInput))
      })
      expect(result.current.values.rememberMe).toBe('ignored')

      act(() => {
        result.current
          .register('plan', { type: 'radio', value: 'pro' })
          .onChange(asChangeEvent(textInput))
      })
      expect(result.current.values.plan).toBe('ignored')
    })

    it('renders empty string for NaN number display values', () => {
      const { result } = renderHook(() =>
        useForm<MixedForm>({
          defaultValues: { ...mixedDefaults, age: Number.NaN },
        }),
      )

      expect(result.current.register('age', { valueAsNumber: true }).value).toBe('')
    })
  })

  describe('values', () => {
    it('updates string, boolean, and number fields with type-safe setters', () => {
      const { result } = renderHook(() =>
        useForm<RegistrationForm>({
          defaultValues: {
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            age: 0,
            acceptTerms: false,
          },
        }),
      )

      act(() => {
        result.current.setValue('name', 'John')
        result.current.setValue('age', 30)
        result.current.setValue('acceptTerms', true)
        result.current.setValues({ email: 'vano@example.com', password: 'secret' })
      })

      expect(result.current.values).toMatchObject({
        name: 'John',
        email: 'vano@example.com',
        password: 'secret',
        age: 30,
        acceptTerms: true,
      })
      expect(result.current.dirtyFields.age).toBe(true)
      expect(result.current.dirtyFields.acceptTerms).toBe(true)
    })

    it('setValue and setValues can touch fields and force validation', async () => {
      const { result } = renderHook(() =>
        useForm<MixedForm>({
          defaultValues: mixedDefaults,
          mode: ValidationMode.OnSubmit,
          rules: {
            email: rules.required('Required'),
          },
        }),
      )

      act(() => {
        result.current.setValue('email', '', { shouldTouch: true, shouldValidate: true })
      })

      await waitFor(() => {
        expect(result.current.touched.email).toBe(true)
        expect(result.current.errors.email).toBe('Required')
      })

      act(() => {
        result.current.setValues(
          { email: 'a@b.com', notes: 'hi' },
          { shouldTouch: true, shouldValidate: true },
        )
      })

      await waitFor(() => {
        expect(result.current.touched.notes).toBe(true)
        expect(result.current.errors.email).toBeUndefined()
      })
    })
  })

  describe('touched and dirty state', () => {
    it('preserves falsy default values when tracking dirty state', () => {
      const { result } = renderHook(() =>
        useForm<LoginForm>({
          defaultValues: loginDefaults,
        }),
      )

      expect(result.current.isDirty).toBe(false)
      expect(result.current.dirtyFields).toEqual({})

      act(() => {
        result.current.setValue('rememberMe', true)
      })

      expect(result.current.values.rememberMe).toBe(true)
      expect(result.current.dirtyFields.rememberMe).toBe(true)
      expect(result.current.isDirty).toBe(true)

      act(() => {
        result.current.setValue('rememberMe', false)
      })

      expect(result.current.isDirty).toBe(false)
      expect(result.current.dirtyFields.rememberMe).toBeUndefined()
    })

    it('marks fields touched on blur via register props', () => {
      const { result } = renderHook(() =>
        useForm<LoginForm>({
          defaultValues: loginDefaults,
        }),
      )

      const props = result.current.register('email')

      act(() => {
        props.onBlur({} as never)
      })

      expect(result.current.touched.email).toBe(true)
    })

    it('clearError and clearErrors remove messages', () => {
      const { result } = renderHook(() =>
        useForm<MixedForm>({
          defaultValues: mixedDefaults,
        }),
      )

      act(() => {
        result.current.setErrors({ email: 'Required', age: 'Bad' })
      })
      act(() => {
        result.current.clearError('email')
      })
      expect(result.current.errors.email).toBeUndefined()
      expect(result.current.errors.age).toBe('Bad')

      act(() => {
        result.current.clearErrors()
      })
      expect(result.current.errors).toEqual({})
    })
  })

  describe('validation', () => {
    describe('validation modes', () => {
      it('validates on change when mode is onChange', async () => {
        const { result } = renderHook(() =>
          useForm<LoginForm>({
            defaultValues: loginDefaults,
            mode: 'onChange',
            fieldValidators: {
              email: (value) => (value ? undefined : 'Required'),
            },
          }),
        )

        act(() => {
          result.current.setValue('email', '')
        })

        await waitFor(() => {
          expect(result.current.errors.email).toBe('Required')
        })

        act(() => {
          result.current.setValue('email', 'a@b.com')
        })

        await waitFor(() => {
          expect(result.current.errors.email).toBeUndefined()
        })
      })

      it('validates on blur when mode is onBlur', async () => {
        const { result } = renderHook(() =>
          useForm<LoginForm>({
            defaultValues: loginDefaults,
            mode: 'onBlur',
            fieldValidators: {
              password: (value) => (String(value).length >= 6 ? undefined : 'Too short'),
            },
          }),
        )

        act(() => {
          result.current.setValue('password', '123')
        })
        expect(result.current.errors.password).toBeUndefined()

        const props = result.current.register('password')
        await act(async () => {
          props.onBlur({} as never)
        })

        await waitFor(() => {
          expect(result.current.errors.password).toBe('Too short')
        })
      })

      it('revalidates on blur after submit when reValidateMode is onBlur', async () => {
        const { result } = renderHook(() =>
          useForm<MixedForm>({
            defaultValues: mixedDefaults,
            mode: ValidationMode.OnSubmit,
            reValidateMode: ReValidateMode.OnBlur,
            rules: {
              email: rules.required('Required'),
            },
          }),
        )

        await act(async () => {
          await result.current.handleSubmit()
        })
        expect(result.current.errors.email).toBe('Required')
        expect(result.current.isSubmitted).toBe(true)

        act(() => {
          result.current.setValue('email', 'a@b.com')
        })
        expect(result.current.errors.email).toBe('Required')

        const props = result.current.register('email')
        await act(async () => {
          props.onBlur({} as never)
        })

        await waitFor(() => {
          expect(result.current.errors.email).toBeUndefined()
        })
      })

      it('revalidates on change after submit when reValidateMode is onChange', async () => {
        const { result } = renderHook(() =>
          useForm<MixedForm>({
            defaultValues: mixedDefaults,
            mode: ValidationMode.OnSubmit,
            reValidateMode: ReValidateMode.OnChange,
            rules: {
              email: rules.required('Required'),
            },
          }),
        )

        await act(async () => {
          await result.current.handleSubmit()
        })
        expect(result.current.errors.email).toBe('Required')

        act(() => {
          result.current.setValue('email', 'a@b.com')
        })

        const props = result.current.register('email')
        await act(async () => {
          props.onBlur({} as never)
        })

        await waitFor(() => {
          expect(result.current.errors.email).toBeUndefined()
        })
      })

      it('accepts ValidationMode constants and string literals', async () => {
        const withConst = renderHook(() =>
          useForm<RegistrationForm>({
            defaultValues: registrationDefaults,
            mode: ValidationMode.OnSubmit,
            reValidateMode: ReValidateMode.OnChange,
            rules: { name: rules.required() },
          }),
        )

        const withString = renderHook(() =>
          useForm<RegistrationForm>({
            defaultValues: registrationDefaults,
            mode: 'onSubmit',
            reValidateMode: 'onChange',
            rules: { name: rules.required() },
          }),
        )

        await act(async () => {
          await withConst.result.current.validate()
          await withString.result.current.validate()
        })

        expect(withConst.result.current.errors.name).toBe('This field is required')
        expect(withString.result.current.errors.name).toBe('This field is required')
      })

      it('revalidates with rules when mode is onChange', async () => {
        const { result } = renderHook(() =>
          useForm<{ email: string }>({
            defaultValues: { email: '' },
            mode: ValidationMode.OnChange,
            rules: {
              email: rules.required('Required'),
            },
          }),
        )

        act(() => {
          result.current.setValue('email', '')
        })

        await waitFor(() => {
          expect(result.current.errors.email).toBe('Required')
        })
      })
    })

    describe('field rules', () => {
      it('supports multiple field-level validators', async () => {
        const { result } = renderHook(() =>
          useForm<LoginForm>({
            defaultValues: loginDefaults,
            fieldValidators: {
              email: [
                (value) => (value ? undefined : 'Required'),
                (value) => (String(value).includes('@') ? undefined : 'Invalid email'),
              ],
            },
          }),
        )

        await act(async () => {
          await result.current.validateField('email')
        })
        expect(result.current.errors.email).toBe('Required')

        act(() => {
          result.current.setValue('email', 'not-an-email')
        })

        await act(async () => {
          await result.current.validateField('email')
        })
        expect(result.current.errors.email).toBe('Invalid email')
      })

      it('runs multiple ordered rules and stops at the first failure', async () => {
        const second = vi.fn(() => 'second')
        const { result } = renderHook(() =>
          useForm<{ username: string }>({
            defaultValues: { username: '' },
            rules: {
              username: [rules.required('Required'), second],
            },
          }),
        )

        await act(async () => {
          await result.current.validateField('username')
        })

        expect(result.current.errors.username).toBe('Required')
        expect(second).not.toHaveBeenCalled()
      })

      it('supports a single rule per field', async () => {
        const { result } = renderHook(() =>
          useForm<{ email: string }>({
            defaultValues: { email: 'bad' },
            rules: {
              email: rules.email('Bad email'),
            },
          }),
        )

        await act(async () => {
          await result.current.validate()
        })

        expect(result.current.errors.email).toBe('Bad email')
      })

      it('supports empty rule arrays safely', async () => {
        const { result } = renderHook(() =>
          useForm<{ email: string }>({
            defaultValues: { email: '' },
            rules: {
              email: [],
            },
          }),
        )

        await act(async () => {
          const ok = await result.current.validate()
          expect(ok).toBe(true)
        })
      })

      it('supports inline, reusable, and cross-field custom rules', async () => {
        const notAdmin = createRule<string, RegistrationForm>((value) =>
          value.toLowerCase().includes('admin') ? 'No admin' : undefined,
        )

        const { result } = renderHook(() =>
          useForm<RegistrationForm>({
            defaultValues: {
              ...registrationDefaults,
              name: 'admin',
              password: 'secret',
              confirmPassword: 'nope',
              email: 'a@b.com',
              acceptTerms: true,
            },
            rules: {
              name: [notAdmin],
              confirmPassword: [
                (value, values) => (value === values.password ? undefined : 'Passwords must match'),
              ],
            },
          }),
        )

        await act(async () => {
          await result.current.validate()
        })

        expect(result.current.errors.name).toBe('No admin')
        expect(result.current.errors.confirmPassword).toBe('Passwords must match')
      })

      it('runs rules before legacy fieldValidators', async () => {
        const fieldValidator = vi.fn(() => 'validator')
        const { result } = renderHook(() =>
          useForm<{ name: string }>({
            defaultValues: { name: '' },
            rules: {
              name: rules.required('From rules'),
            },
            fieldValidators: {
              name: fieldValidator,
            },
          }),
        )

        await act(async () => {
          await result.current.validateField('name')
        })

        expect(result.current.errors.name).toBe('From rules')
        expect(fieldValidator).not.toHaveBeenCalled()
      })

      it('does not mutate consumer rule arrays', async () => {
        const emailRules = [rules.required(), rules.email()] as const
        const snapshot = [...emailRules]

        const { result } = renderHook(() =>
          useForm<{ email: string }>({
            defaultValues: { email: '' },
            rules: { email: emailRules },
          }),
        )

        await act(async () => {
          await result.current.validate()
        })

        expect(emailRules).toEqual(snapshot)
      })
    })

    describe('form-level validation', () => {
      it('runs synchronous form-level validation', async () => {
        const { result } = renderHook(() =>
          useForm<LoginForm>({
            defaultValues: loginDefaults,
            validate: (values) => {
              const errors: FieldErrors<LoginForm> = {}
              if (!values.email) errors.email = 'Email is required'
              if (!values.password) errors.password = 'Password is required'
              return errors
            },
          }),
        )

        let valid = true
        await act(async () => {
          valid = await result.current.validate()
        })

        expect(valid).toBe(false)
        expect(result.current.errors.email).toBe('Email is required')
        expect(result.current.errors.password).toBe('Password is required')
        expect(result.current.isValid).toBe(false)
      })

      it('supports cross-field validation', async () => {
        const { result } = renderHook(() =>
          useForm<RegistrationForm>({
            defaultValues: {
              name: 'A',
              email: 'a@b.com',
              password: 'secret1',
              confirmPassword: 'secret2',
              age: 20,
              acceptTerms: true,
            },
            validate: (values) => {
              if (values.password !== values.confirmPassword) {
                return { confirmPassword: 'Passwords must match' }
              }
              return {}
            },
          }),
        )

        await act(async () => {
          await result.current.validate()
        })

        expect(result.current.errors.confirmPassword).toBe('Passwords must match')
      })

      it('lets form-level validate override field rule errors for the same key', async () => {
        const { result } = renderHook(() =>
          useForm<{ email: string }>({
            defaultValues: { email: '' },
            rules: {
              email: rules.required('From rules'),
            },
            validate: () => ({ email: 'From form validate' }),
          }),
        )

        await act(async () => {
          await result.current.validate()
        })

        expect(result.current.errors.email).toBe('From form validate')
      })
    })

    describe('asynchronous validation', () => {
      it('supports asynchronous validation and clears errors when valid', async () => {
        const { result } = renderHook(() =>
          useForm<LoginForm>({
            defaultValues: { ...loginDefaults, email: 'taken@example.com' },
            validate: async (values) => {
              await Promise.resolve()
              if (values.email === 'taken@example.com') {
                return { email: 'Email is taken' }
              }
              return {}
            },
          }),
        )

        await act(async () => {
          await result.current.validate()
        })
        expect(result.current.errors.email).toBe('Email is taken')

        act(() => {
          result.current.setValue('email', 'free@example.com')
        })

        await act(async () => {
          await result.current.validate()
        })
        expect(result.current.errors.email).toBeUndefined()
        expect(result.current.isValid).toBe(true)
      })

      it('supports async custom rules and preserves unexpected rejections', async () => {
        const { result } = renderHook(() =>
          useForm<{ email: string }>({
            defaultValues: { email: 'a@b.com' },
            rules: {
              email: [
                rules.email(),
                async (email) => {
                  await Promise.resolve()
                  return email === 'a@b.com' ? 'Taken' : undefined
                },
              ],
            },
          }),
        )

        await act(async () => {
          await result.current.validate()
        })
        expect(result.current.errors.email).toBe('Taken')

        const rejecting = renderHook(() =>
          useForm<{ email: string }>({
            defaultValues: { email: 'a@b.com' },
            rules: {
              email: [
                async () => {
                  throw new Error('network')
                },
              ],
            },
          }),
        )

        await expect(
          act(async () => {
            await rejecting.result.current.validate()
          }),
        ).rejects.toThrow('network')
      })

      it('restores isValidating after a rejecting field validator', async () => {
        const { result } = renderHook(() =>
          useForm<MixedForm>({
            defaultValues: mixedDefaults,
            fieldValidators: {
              email: async () => {
                throw new Error('boom')
              },
            },
          }),
        )

        await expect(
          act(async () => {
            await result.current.validateField('email')
          }),
        ).rejects.toThrow('boom')

        expect(result.current.isValidating).toBe(false)
      })

      it('skips mounted-only state updates after unmount', async () => {
        const { result, unmount } = renderHook(() =>
          useForm<MixedForm>({
            defaultValues: mixedDefaults,
            fieldValidators: {
              email: async () => 'Required',
            },
          }),
        )

        const { validate, validateField, handleSubmit } = result.current
        unmount()

        await expect(validate()).resolves.toBe(false)
        await expect(validateField('email')).resolves.toBe(false)
        await expect(handleSubmit()).resolves.toBeUndefined()
      })
    })

    describe('validation race conditions', () => {
      it('ignores stale async form validation results', async () => {
        let resolveFirst!: (errors: FieldErrors<LoginForm>) => void
        const first = new Promise<FieldErrors<LoginForm>>((resolve) => {
          resolveFirst = resolve
        })

        let call = 0
        const { result } = renderHook(() =>
          useForm<LoginForm>({
            defaultValues: loginDefaults,
            validate: async () => {
              call += 1
              if (call === 1) {
                return first
              }
              return { email: 'second' }
            },
          }),
        )

        let firstValidate!: Promise<boolean>
        act(() => {
          firstValidate = result.current.validate()
        })

        await act(async () => {
          await result.current.validate()
        })
        expect(result.current.errors.email).toBe('second')

        resolveFirst({ email: 'first-stale' })
        await act(async () => {
          await firstValidate
        })

        expect(result.current.errors.email).toBe('second')
      })

      it('ignores stale async field validation results', async () => {
        let resolveFirst!: (message: string | undefined) => void
        const first = new Promise<string | undefined>((resolve) => {
          resolveFirst = resolve
        })

        let call = 0
        const { result } = renderHook(() =>
          useForm<LoginForm>({
            defaultValues: loginDefaults,
            fieldValidators: {
              email: async () => {
                call += 1
                if (call === 1) {
                  return first
                }
                return 'second'
              },
            },
          }),
        )

        let firstValidate!: Promise<boolean>
        act(() => {
          firstValidate = result.current.validateField('email')
        })

        await act(async () => {
          await result.current.validateField('email')
        })
        expect(result.current.errors.email).toBe('second')

        resolveFirst('first-stale')
        await act(async () => {
          await firstValidate
        })

        expect(result.current.errors.email).toBe('second')
      })

      it('ignores stale async rule results', async () => {
        let resolveFirst!: (message: string | undefined) => void
        const first = new Promise<string | undefined>((resolve) => {
          resolveFirst = resolve
        })
        let call = 0

        const { result } = renderHook(() =>
          useForm<{ email: string }>({
            defaultValues: { email: 'a@b.com' },
            rules: {
              email: [
                async () => {
                  call += 1
                  if (call === 1) return first
                  return 'second'
                },
              ],
            },
          }),
        )

        let firstValidate!: Promise<boolean>
        act(() => {
          firstValidate = result.current.validate()
        })

        await act(async () => {
          await result.current.validate()
        })
        expect(result.current.errors.email).toBe('second')

        resolveFirst('first-stale')
        await act(async () => {
          await firstValidate
        })
        expect(result.current.errors.email).toBe('second')
      })

      it('ignores stale rejected form validation after a newer run', async () => {
        let rejectFirst!: (error: Error) => void
        const first = new Promise<FieldErrors<MixedForm>>((_resolve, reject) => {
          rejectFirst = reject
        })

        let call = 0
        const { result } = renderHook(() =>
          useForm<MixedForm>({
            defaultValues: mixedDefaults,
            validate: async () => {
              call += 1
              if (call === 1) {
                return first
              }
              return {}
            },
          }),
        )

        let firstValidate!: Promise<boolean>
        act(() => {
          firstValidate = result.current.validate()
        })

        await act(async () => {
          await result.current.validate()
        })

        rejectFirst(new Error('stale form boom'))
        await expect(
          act(async () => {
            await firstValidate
          }),
        ).rejects.toThrow('stale form boom')

        expect(result.current.isValidating).toBe(false)
      })

      it('does not clear isValidating from a stale rejected field validator', async () => {
        let rejectFirst!: (error: Error) => void
        const first = new Promise<string | undefined>((_resolve, reject) => {
          rejectFirst = reject
        })

        let call = 0
        const { result } = renderHook(() =>
          useForm<MixedForm>({
            defaultValues: mixedDefaults,
            fieldValidators: {
              email: async () => {
                call += 1
                if (call === 1) {
                  return first
                }
                return undefined
              },
            },
          }),
        )

        let firstValidate!: Promise<boolean>
        act(() => {
          firstValidate = result.current.validateField('email')
        })

        await act(async () => {
          await result.current.validateField('email')
        })
        expect(result.current.isValidating).toBe(false)

        rejectFirst(new Error('stale boom'))
        await expect(
          act(async () => {
            await firstValidate
          }),
        ).rejects.toThrow('stale boom')

        expect(result.current.isValidating).toBe(false)
      })
    })
  })

  describe('submission', () => {
    it('submits valid forms and exposes loading state', async () => {
      let release!: () => void
      const gate = new Promise<void>((resolve) => {
        release = resolve
      })

      const onSubmit = vi.fn(async () => {
        await gate
      })

      const { result } = renderHook(() =>
        useForm<LoginForm>({
          defaultValues: { email: 'a@b.com', password: 'secret', rememberMe: true },
          onSubmit,
        }),
      )

      let submitPromise: Promise<void>
      act(() => {
        submitPromise = result.current.handleSubmit()
      })

      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(true)
      })

      release()
      await act(async () => {
        await submitPromise!
      })

      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit).toHaveBeenCalledWith(
        {
          email: 'a@b.com',
          password: 'secret',
          rememberMe: true,
        },
        expect.objectContaining({
          setError: expect.any(Function),
          setErrors: expect.any(Function),
          setSubmitError: expect.any(Function),
          reset: expect.any(Function),
        }),
      )
      expect(result.current.isSubmitting).toBe(false)
      expect(result.current.isSubmitted).toBe(true)
      expect(result.current.submitCount).toBe(1)
    })

    it('prevents invalid submission and marks fields touched', async () => {
      const onSubmit = vi.fn()
      const { result } = renderHook(() =>
        useForm<LoginForm>({
          defaultValues: loginDefaults,
          validate: (values) => (!values.email ? { email: 'Required' } : {}),
          onSubmit,
        }),
      )

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(onSubmit).not.toHaveBeenCalled()
      expect(result.current.errors.email).toBe('Required')
      expect(result.current.touched.email).toBe(true)
      expect(result.current.touched.password).toBe(true)
      expect(result.current.isSubmitting).toBe(false)
      expect(result.current.isSubmitted).toBe(true)
      expect(result.current.submitCount).toBe(1)
    })

    it('prevents duplicate submissions while in flight', async () => {
      let release!: () => void
      const gate = new Promise<void>((resolve) => {
        release = resolve
      })
      const onSubmit = vi.fn(async () => {
        await gate
      })

      const { result } = renderHook(() =>
        useForm<LoginForm>({
          defaultValues: { ...loginDefaults, email: 'a@b.com', password: 'x' },
          onSubmit,
        }),
      )

      let first!: Promise<void>
      let second!: Promise<void>

      act(() => {
        first = result.current.handleSubmit()
        second = result.current.handleSubmit()
      })

      release()
      await act(async () => {
        await Promise.all([first, second])
      })

      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(result.current.submitCount).toBe(1)
    })

    it('preserves unexpected submit errors after restoring submitting state', async () => {
      const { result } = renderHook(() =>
        useForm<LoginForm>({
          defaultValues: { ...loginDefaults, email: 'a@b.com', password: 'x' },
          onSubmit: async () => {
            throw new Error('network down')
          },
        }),
      )

      let caught: unknown
      await act(async () => {
        try {
          await result.current.handleSubmit()
        } catch (error) {
          caught = error
        }
      })

      expect(caught).toEqual(expect.objectContaining({ message: 'network down' }))
      expect(result.current.isSubmitting).toBe(false)
      expect(result.current.isSubmitted).toBe(true)
    })

    it('calls preventDefault on submit events', async () => {
      const { result } = renderHook(() =>
        useForm<LoginForm>({
          defaultValues: { ...loginDefaults, email: 'a@b.com', password: 'x' },
        }),
      )

      const preventDefault = vi.fn()
      await act(async () => {
        await result.current.handleSubmit({ preventDefault } as never)
      })

      expect(preventDefault).toHaveBeenCalledTimes(1)
    })

    it('focuses the first invalid field via DOM id when no ref is stored', async () => {
      const focus = vi.fn()
      const input = document.createElement('input')
      input.id = 'focus-demo-field-email'
      input.focus = focus
      document.body.appendChild(input)

      const { result } = renderHook(() =>
        useForm<MixedForm>({
          id: 'focus-demo',
          defaultValues: mixedDefaults,
          rules: {
            email: rules.required('Required'),
          },
        }),
      )

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(focus).toHaveBeenCalled()
      input.remove()
    })

    it('uses a registered element ref for focus when available', async () => {
      const focus = vi.fn()
      const { result } = renderHook(() =>
        useForm<MixedForm>({
          defaultValues: mixedDefaults,
          rules: {
            email: rules.required('Required'),
          },
        }),
      )

      const props = result.current.register('email')
      const input = document.createElement('input')
      input.focus = focus
      act(() => {
        props.ref(input)
      })

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(focus).toHaveBeenCalled()

      act(() => {
        props.ref(null)
      })
    })

    it('skips focusing when focusOnError is false', async () => {
      const focus = vi.fn()
      const input = document.createElement('input')
      input.id = 'nofocus-field-email'
      input.focus = focus
      document.body.appendChild(input)

      const { result } = renderHook(() =>
        useForm<MixedForm>({
          id: 'nofocus',
          defaultValues: mixedDefaults,
          focusOnError: false,
          rules: {
            email: rules.required('Required'),
          },
        }),
      )

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(focus).not.toHaveBeenCalled()
      input.remove()
    })

    it('skips focus when getFirstErrorField returns undefined', async () => {
      const spy = vi.spyOn(formUtilities, 'getFirstErrorField').mockReturnValue(undefined)
      const focus = vi.fn()
      const input = document.createElement('input')
      input.id = 'empty-first-field-email'
      input.focus = focus
      document.body.appendChild(input)

      const { result } = renderHook(() =>
        useForm<MixedForm>({
          id: 'empty-first',
          defaultValues: mixedDefaults,
          rules: {
            email: rules.required('Required'),
          },
        }),
      )

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(focus).not.toHaveBeenCalled()
      spy.mockRestore()
      input.remove()
    })

    it('prevents invalid submission and allows valid submission with rules', async () => {
      const onSubmit = vi.fn()
      const { result } = renderHook(() =>
        useForm<RegistrationForm>({
          defaultValues: registrationDefaults,
          rules: {
            email: [rules.required(), rules.email()],
            password: rules.required(),
            acceptTerms: rules.accepted(),
          },
          onSubmit,
        }),
      )

      await act(async () => {
        await result.current.handleSubmit()
      })
      expect(onSubmit).not.toHaveBeenCalled()
      expect(result.current.errors.email).toBeTruthy()

      act(() => {
        result.current.setValues({
          email: 'a@b.com',
          password: 'secret',
          acceptTerms: true,
        })
      })

      await act(async () => {
        await result.current.handleSubmit()
      })
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })
  })

  describe('backend errors', () => {
    it('maps backend validation errors and form-level submit errors', async () => {
      const { result } = renderHook(() =>
        useForm<LoginForm>({
          defaultValues: { ...loginDefaults, email: 'a@b.com', password: 'x' },
          onSubmit: async (_values, helpers) => {
            helpers.setErrors({ email: 'This email is already registered.' })
            helpers.setSubmitError('Registration failed')
          },
        }),
      )

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(result.current.errors.email).toBe('This email is already registered.')
      expect(result.current.submitError).toBe('Registration failed')
    })

    it('keeps backend setErrors and reset working with rules', async () => {
      const { result } = renderHook(() =>
        useForm<RegistrationForm>({
          defaultValues: {
            ...registrationDefaults,
            email: 'a@b.com',
            password: 'x',
            acceptTerms: true,
          },
          rules: {
            email: rules.email(),
          },
          onSubmit: async (_values, helpers) => {
            helpers.setErrors({
              email: 'Already registered',
            } satisfies FieldErrors<RegistrationForm>)
          },
        }),
      )

      await act(async () => {
        await result.current.handleSubmit()
      })
      expect(result.current.errors.email).toBe('Already registered')

      act(() => {
        result.current.reset()
      })
      expect(result.current.errors).toEqual({})
      expect(result.current.values.email).toBe('a@b.com')
    })
  })

  describe('reset', () => {
    it('resets to original defaults and clears interaction state', () => {
      const { result } = renderHook(() =>
        useForm<LoginForm>({
          defaultValues: loginDefaults,
        }),
      )

      act(() => {
        result.current.setValue('email', 'a@b.com')
        result.current.setError('email', 'Nope')
        result.current.setSubmitError('Boom')
      })

      act(() => {
        result.current.register('email').onBlur({} as never)
      })

      act(() => {
        result.current.reset()
      })

      expect(result.current.values).toEqual(loginDefaults)
      expect(result.current.errors).toEqual({})
      expect(result.current.touched).toEqual({})
      expect(result.current.submitError).toBeUndefined()
      expect(result.current.isDirty).toBe(false)
    })

    it('resets with new default values when requested', () => {
      const { result } = renderHook(() =>
        useForm<LoginForm>({
          defaultValues: loginDefaults,
        }),
      )

      act(() => {
        result.current.reset({ email: 'new@example.com', rememberMe: true })
      })

      expect(result.current.values.email).toBe('new@example.com')
      expect(result.current.values.rememberMe).toBe(true)
      expect(result.current.defaultValues.email).toBe('new@example.com')
      expect(result.current.isDirty).toBe(false)

      act(() => {
        result.current.setValue('email', 'other@example.com')
      })
      expect(result.current.isDirty).toBe(true)

      act(() => {
        result.current.reset()
      })
      expect(result.current.values.email).toBe('new@example.com')
    })

    it('can reset values without updating stored defaults', () => {
      const { result } = renderHook(() =>
        useForm<LoginForm>({
          defaultValues: loginDefaults,
        }),
      )

      act(() => {
        result.current.reset({ email: 'temp@example.com' }, { keepDefaultValues: true })
      })

      expect(result.current.values.email).toBe('temp@example.com')
      expect(result.current.defaultValues.email).toBe('')
      expect(result.current.isDirty).toBe(true)
    })

    it('resets an individual field to its default', () => {
      const { result } = renderHook(() =>
        useForm<LoginForm>({
          defaultValues: loginDefaults,
        }),
      )

      act(() => {
        result.current.setValue('email', 'a@b.com')
        result.current.setValue('password', 'secret')
        result.current.setError('email', 'err')
      })

      act(() => {
        result.current.resetField('email')
      })

      expect(result.current.values.email).toBe('')
      expect(result.current.values.password).toBe('secret')
      expect(result.current.errors.email).toBeUndefined()
      expect(result.current.dirtyFields.email).toBeUndefined()
    })

    it('reset can keep selected values and submission metadata', () => {
      const { result } = renderHook(() =>
        useForm<MixedForm>({
          defaultValues: mixedDefaults,
        }),
      )

      act(() => {
        result.current.setValue('email', 'kept@example.com')
        result.current.setValue('notes', 'draft')
        result.current.setError('email', 'stale')
        result.current.setSubmitError('server')
      })

      act(() => {
        result.current.reset(
          { notes: '' },
          {
            keepValues: ['email'],
            keepErrors: true,
            keepTouched: true,
            keepSubmitError: true,
            keepIsSubmitted: true,
            keepSubmitCount: true,
          },
        )
      })

      expect(result.current.values.email).toBe('kept@example.com')
      expect(result.current.values.notes).toBe('')
      expect(result.current.errors.email).toBe('stale')
      expect(result.current.submitError).toBe('server')
    })
  })

  describe('accessibility', () => {
    it('exposes accessible field ids from register', () => {
      const { result } = renderHook(() =>
        useForm<LoginForm>({
          defaultValues: loginDefaults,
          id: 'login',
        }),
      )

      act(() => {
        result.current.setError('email', 'Required')
      })

      const props = result.current.register('email')
      expect(props.id).toBe('login-field-email')
      expect(props['aria-invalid']).toBe(true)
      expect(props['aria-describedby']).toBe('login-error-email')
      expect(result.current.getErrorId('email')).toBe('login-error-email')
    })

    it('exposes getFieldId and getErrorId helpers', () => {
      const { result } = renderHook(() =>
        useForm<MixedForm>({
          id: 'ids',
          defaultValues: mixedDefaults,
        }),
      )

      expect(result.current.getFieldId('email')).toBe('ids-field-email')
      expect(result.current.getErrorId('email')).toBe('ids-error-email')
    })

    it('gives radio options unique ids, a shared error id, and label association', () => {
      const { result } = renderHook(() =>
        useForm<MixedForm>({
          id: 'plan-form',
          defaultValues: mixedDefaults,
        }),
      )

      const basic = result.current.register('plan', { type: 'radio', value: 'basic' })
      const pro = result.current.register('plan', { type: 'radio', value: 'pro' })
      const dotted = result.current.register('plan', { type: 'radio', value: 'pro.plan' })
      const dashed = result.current.register('plan', { type: 'radio', value: 'pro-plan' })
      const override = result.current.register('plan', {
        type: 'radio',
        value: 'enterprise',
        id: 'plan-enterprise',
      })
      const checkbox = result.current.register('rememberMe')
      const text = result.current.register('email')

      expect(basic.id).toBe('plan-form-field-plan-option-basic')
      expect(pro.id).toBe('plan-form-field-plan-option-pro')
      expect(dotted.id).not.toBe(dashed.id)
      expect(override.id).toBe('plan-enterprise')
      expect(basic.name).toBe('plan')
      expect(pro.name).toBe('plan')
      expect(basic['aria-describedby']).toBeUndefined()
      expect(result.current.getErrorId('plan')).toBe('plan-form-error-plan')
      expect(checkbox.id).toBe('plan-form-field-rememberMe')
      expect(text.id).toBe('plan-form-field-email')

      act(() => {
        result.current.setError('plan', 'Choose a plan')
      })
      expect(
        result.current.register('plan', { type: 'radio', value: 'basic' })['aria-describedby'],
      ).toBe('plan-form-error-plan')
      expect(
        result.current.register('plan', { type: 'radio', value: 'pro' })['aria-describedby'],
      ).toBe('plan-form-error-plan')
    })

    it('focuses a connected radio option on submit error', async () => {
      const { result } = renderHook(() =>
        useForm<MixedForm>({
          id: 'focus-plan',
          defaultValues: { ...mixedDefaults, plan: '' },
          rules: { plan: rules.required('Plan required') },
        }),
      )

      const basic = document.createElement('input')
      basic.type = 'radio'
      const pro = document.createElement('input')
      pro.type = 'radio'
      document.body.append(basic, pro)
      const focusSpy = vi.spyOn(basic, 'focus')

      act(() => {
        result.current.register('plan', { type: 'radio', value: 'basic' }).ref(basic)
        result.current.register('plan', { type: 'radio', value: 'pro' }).ref(pro)
      })

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(focusSpy).toHaveBeenCalled()
      basic.remove()
      pro.remove()
    })
  })

  describe('nested registration', () => {
    it('register returns value, name, and id for nested text fields', () => {
      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          id: 'profile',
          defaultValues: { ...profileDefaults, address: { city: 'Yerevan', postalCode: '' } },
        }),
      )

      const props = result.current.register('address.city')
      expect(props.name).toBe('address.city')
      expect(props.value).toBe('Yerevan')
      expect(props.id).toBe('profile-field-address.city')
    })

    it('binds nested checkbox preferences.newsletter through register', () => {
      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          defaultValues: profileDefaults,
        }),
      )

      expect(result.current.register('preferences.newsletter').checked).toBe(false)

      const checkboxInput = document.createElement('input')
      checkboxInput.type = 'checkbox'
      checkboxInput.checked = true
      act(() => {
        result.current.register('preferences.newsletter').onChange(asChangeEvent(checkboxInput))
      })

      expect(result.current.values.preferences.newsletter).toBe(true)
      expect(result.current.register('preferences.newsletter').checked).toBe(true)
    })

    it('binds nested radio preferences.plan through register', () => {
      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          defaultValues: profileDefaults,
        }),
      )

      const radioProps = result.current.register('preferences.plan', {
        type: 'radio',
        value: 'pro',
      })
      expect(radioProps.checked).toBe(false)

      const radioInput = document.createElement('input')
      radioInput.type = 'radio'
      radioInput.value = 'pro'
      radioInput.checked = true
      act(() => {
        radioProps.onChange(asChangeEvent(radioInput))
      })

      expect(result.current.values.preferences.plan).toBe('pro')
      expect(
        result.current.register('preferences.plan', { type: 'radio', value: 'pro' }).checked,
      ).toBe(true)
    })

    it('parses nested number age with valueAsNumber via a real DOM input', () => {
      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          defaultValues: profileDefaults,
        }),
      )

      const ageInput = document.createElement('input')
      ageInput.type = 'number'
      ageInput.value = '42'
      act(() => {
        result.current.register('age', { valueAsNumber: true }).onChange(asChangeEvent(ageInput))
      })

      expect(result.current.values.age).toBe(42)
    })
  })

  describe('nested values', () => {
    it('setValue mutates only the targeted nested leaf', () => {
      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          defaultValues: {
            ...profileDefaults,
            address: { city: '', postalCode: '0010' },
          },
        }),
      )

      act(() => {
        result.current.setValue('address.city', 'Yerevan')
      })

      expect(result.current.values.address).toEqual({ city: 'Yerevan', postalCode: '0010' })
      expect(result.current.values.personal).toEqual(profileDefaults.personal)
    })

    it('setValues deep partial preserves address.postalCode', () => {
      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          defaultValues: {
            ...profileDefaults,
            address: { city: '', postalCode: '0010' },
          },
        }),
      )

      act(() => {
        result.current.setValues({ address: { city: 'Yerevan' } })
      })

      expect(result.current.values.address.city).toBe('Yerevan')
      expect(result.current.values.address.postalCode).toBe('0010')
    })

    it('does not mutate the caller defaultValues object', () => {
      const source = {
        ...profileDefaults,
        address: { ...profileDefaults.address },
        personal: { ...profileDefaults.personal },
        preferences: { ...profileDefaults.preferences },
      }

      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          defaultValues: source,
        }),
      )

      act(() => {
        result.current.setValue('address.city', 'Yerevan')
      })

      expect(source.address.city).toBe('')
      expect(result.current.values.address.city).toBe('Yerevan')
      expect(result.current.values).not.toBe(source)
    })
  })

  describe('nested touched state', () => {
    it('blur marks touched for address.city', () => {
      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          defaultValues: profileDefaults,
        }),
      )

      const props = result.current.register('address.city')
      act(() => {
        props.onBlur({} as never)
      })

      expect(result.current.touched['address.city']).toBe(true)
      expect(result.current.touched['address.postalCode']).toBeUndefined()
    })

    it('setValue can mark nested paths touched via shouldTouch', () => {
      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          defaultValues: profileDefaults,
        }),
      )

      act(() => {
        result.current.setValue('address.city', 'Yerevan', { shouldTouch: true })
      })

      expect(result.current.touched['address.city']).toBe(true)
    })
  })

  describe('nested dirty state', () => {
    it('marks dirtyFields for address.city when city changes', () => {
      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          defaultValues: {
            ...profileDefaults,
            address: { city: '', postalCode: '0010' },
          },
        }),
      )

      act(() => {
        result.current.setValue('address.city', 'Yerevan')
      })

      expect(result.current.dirtyFields['address.city']).toBe(true)
      expect(result.current.dirtyFields['address.postalCode']).toBeUndefined()
      expect(result.current.isDirty).toBe(true)
    })

    it('clearing a nested field back to default removes dirty', () => {
      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          defaultValues: profileDefaults,
        }),
      )

      act(() => {
        result.current.setValue('address.city', 'Yerevan')
      })
      expect(result.current.dirtyFields['address.city']).toBe(true)

      act(() => {
        result.current.setValue('address.city', '')
      })

      expect(result.current.dirtyFields['address.city']).toBeUndefined()
      expect(result.current.isDirty).toBe(false)
    })

    it('does not mark sibling postalCode dirty when only city changes', () => {
      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          defaultValues: {
            ...profileDefaults,
            address: { city: '', postalCode: '0010' },
          },
        }),
      )

      act(() => {
        result.current.setValue('address.city', 'Yerevan')
      })

      expect(result.current.dirtyFields['address.city']).toBe(true)
      expect(result.current.dirtyFields['address.postalCode']).toBeUndefined()
      expect(result.current.dirtyFields['personal.firstName']).toBeUndefined()
    })
  })

  describe('nested validation', () => {
    it('runs rules on nested paths address.city and personal.firstName', async () => {
      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          defaultValues: profileDefaults,
          rules: {
            'address.city': rules.required('City required'),
            'personal.firstName': rules.required('First name required'),
          },
        }),
      )

      await act(async () => {
        await result.current.validate()
      })

      expect(result.current.errors['address.city']).toBe('City required')
      expect(result.current.errors['personal.firstName']).toBe('First name required')
    })

    it('validateField validates a single nested path', async () => {
      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          defaultValues: profileDefaults,
          rules: {
            'address.city': rules.required('City required'),
            'personal.firstName': rules.required('First name required'),
          },
        }),
      )

      await act(async () => {
        await result.current.validateField('address.city')
      })

      expect(result.current.errors['address.city']).toBe('City required')
      expect(result.current.errors['personal.firstName']).toBeUndefined()
    })

    it('form-level validate can set errors on address.city', async () => {
      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          defaultValues: profileDefaults,
          validate: (values) => {
            const errors: FieldErrors<ProfileForm> = {}
            if (!values.address.city) errors['address.city'] = 'City from form validate'
            return errors
          },
        }),
      )

      await act(async () => {
        await result.current.validate()
      })

      expect(result.current.errors['address.city']).toBe('City from form validate')
    })

    it('custom rule receives the nested string leaf value', async () => {
      const cityRule = vi.fn((value: string) =>
        value === 'Yerevan' ? undefined : 'Must be Yerevan',
      )

      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          defaultValues: {
            ...profileDefaults,
            address: { city: 'Gyumri', postalCode: '' },
          },
          rules: {
            'address.city': [cityRule],
          },
        }),
      )

      await act(async () => {
        await result.current.validateField('address.city')
      })

      expect(cityRule).toHaveBeenCalledWith(
        'Gyumri',
        expect.objectContaining({
          address: expect.objectContaining({ city: 'Gyumri' }),
        }),
        expect.objectContaining({
          name: 'address.city',
          reason: 'manual',
        }),
      )
      expect(result.current.errors['address.city']).toBe('Must be Yerevan')
    })

    it('supports async rules on nested paths', async () => {
      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          defaultValues: {
            ...profileDefaults,
            address: { city: 'taken', postalCode: '' },
          },
          rules: {
            'address.city': [
              async (city) => {
                await Promise.resolve()
                return city === 'taken' ? 'City taken' : undefined
              },
            ],
          },
        }),
      )

      await act(async () => {
        await result.current.validateField('address.city')
      })

      expect(result.current.errors['address.city']).toBe('City taken')
    })

    it('setError and clearError work with nested paths', () => {
      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          defaultValues: profileDefaults,
        }),
      )

      act(() => {
        result.current.setError('address.city', 'Invalid city')
        result.current.setError('personal.firstName', 'Invalid name')
      })

      expect(result.current.errors['address.city']).toBe('Invalid city')
      expect(result.current.errors['personal.firstName']).toBe('Invalid name')

      act(() => {
        result.current.clearError('address.city')
      })

      expect(result.current.errors['address.city']).toBeUndefined()
      expect(result.current.errors['personal.firstName']).toBe('Invalid name')
    })
  })

  describe('nested reset', () => {
    it('resetField restores only the targeted nested leaf', () => {
      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          defaultValues: {
            ...profileDefaults,
            address: { city: '', postalCode: '0010' },
          },
        }),
      )

      act(() => {
        result.current.setValue('address.city', 'Yerevan')
        result.current.setValue('address.postalCode', '0001')
        result.current.setError('address.city', 'err')
      })

      act(() => {
        result.current.resetField('address.city')
      })

      expect(result.current.values.address.city).toBe('')
      expect(result.current.values.address.postalCode).toBe('0001')
      expect(result.current.errors['address.city']).toBeUndefined()
      expect(result.current.dirtyFields['address.city']).toBeUndefined()
    })

    it('reset restores full nested defaults', () => {
      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          defaultValues: profileDefaults,
        }),
      )

      act(() => {
        result.current.setValue('address.city', 'Yerevan')
        result.current.setValue('personal.firstName', 'Vano')
        result.current.setError('address.city', 'err')
      })

      act(() => {
        result.current.reset()
      })

      expect(result.current.values).toEqual(profileDefaults)
      expect(result.current.errors).toEqual({})
      expect(result.current.isDirty).toBe(false)
    })

    it('reset with nested partial deep-merges without wiping postalCode', () => {
      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          defaultValues: {
            ...profileDefaults,
            address: { city: '', postalCode: '0010' },
          },
        }),
      )

      act(() => {
        result.current.reset({ address: { city: 'Gyumri' } })
      })

      expect(result.current.values.address.city).toBe('Gyumri')
      expect(result.current.values.address.postalCode).toBe('0010')
      expect(result.current.defaultValues.address.city).toBe('Gyumri')
      expect(result.current.defaultValues.address.postalCode).toBe('0010')
    })

    it('reset can keep selected nested values', () => {
      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          defaultValues: profileDefaults,
        }),
      )

      act(() => {
        result.current.setValue('address.city', 'Yerevan')
        result.current.setValue('personal.firstName', 'Vano')
      })

      act(() => {
        result.current.reset(undefined, { keepValues: ['address.city'] })
      })

      expect(result.current.values.address.city).toBe('Yerevan')
      expect(result.current.values.personal.firstName).toBe('')
    })
  })

  describe('nested submission', () => {
    it('onSubmit receives the nested values object', async () => {
      const onSubmit = vi.fn()
      const filled: ProfileForm = {
        personal: { firstName: 'Vano', lastName: 'Muradyan' },
        address: { city: 'Yerevan', postalCode: '0010' },
        preferences: { newsletter: true, plan: 'pro' },
        age: 30,
      }

      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          defaultValues: filled,
          onSubmit,
        }),
      )

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(onSubmit).toHaveBeenCalledWith(
        filled,
        expect.objectContaining({
          setError: expect.any(Function),
          setErrors: expect.any(Function),
        }),
      )
    })

    it('backend setErrors maps nested paths like personal.firstName', async () => {
      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          defaultValues: {
            ...profileDefaults,
            personal: { firstName: 'Vano', lastName: '' },
            address: { city: 'Yerevan', postalCode: '' },
          },
          onSubmit: async (_values, helpers) => {
            helpers.setErrors({
              'personal.firstName': 'Name already taken',
            } satisfies FieldErrors<ProfileForm>)
          },
        }),
      )

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(result.current.errors['personal.firstName']).toBe('Name already taken')
    })

    it('focuses the first nested invalid field via DOM id', async () => {
      const focus = vi.fn()
      const input = document.createElement('input')
      input.id = 'nested-focus-field-address.city'
      input.focus = focus
      document.body.appendChild(input)

      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          id: 'nested-focus',
          defaultValues: profileDefaults,
          rules: {
            'address.city': rules.required('Required'),
          },
        }),
      )

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(focus).toHaveBeenCalled()
      input.remove()
    })
  })

  describe('nested accessibility', () => {
    it('exposes getFieldId and getErrorId for nested paths', () => {
      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          id: 'profile',
          defaultValues: profileDefaults,
        }),
      )

      expect(result.current.getFieldId('address.city')).toBe('profile-field-address.city')
      expect(result.current.getErrorId('address.city')).toBe('profile-error-address.city')
    })

    it('sets aria-invalid and aria-describedby on nested register props', () => {
      const { result } = renderHook(() =>
        useForm<ProfileForm>({
          id: 'profile',
          defaultValues: profileDefaults,
        }),
      )

      act(() => {
        result.current.setError('address.city', 'Required')
      })

      const props = result.current.register('address.city')
      expect(props['aria-invalid']).toBe(true)
      expect(props['aria-describedby']).toBe('profile-error-address.city')
      expect(props.id).toContain('address.city')
    })

    it('keeps nested path ids distinct from dashed flat-style names', () => {
      const nested = renderHook(() =>
        useForm<ProfileForm>({
          id: 'ids',
          defaultValues: profileDefaults,
        }),
      )
      const flat = renderHook(() =>
        useForm<{ 'address-city': string }>({
          id: 'ids',
          defaultValues: { 'address-city': '' },
        }),
      )

      const nestedId = nested.result.current.getFieldId('address.city')
      const flatId = flat.result.current.getFieldId('address-city')

      expect(nestedId).toContain('address.city')
      expect(nestedId).toBe('ids-field-address.city')
      expect(flatId).toBe('ids-field-address-city')
      expect(nestedId).not.toBe(flatId)
    })
  })

  describe('file registration', () => {
    it('register(avatar, { type: file }) omits value and checked but exposes handlers', () => {
      const { result } = renderHook(() =>
        useForm<FileForm>({
          id: 'files',
          defaultValues: fileDefaults,
        }),
      )

      const props = result.current.register('avatar', { type: 'file' })
      expect(props.value).toBeUndefined()
      expect(props.checked).toBeUndefined()
      expect(props.name).toBe('avatar')
      expect(props.id).toBe('files-field-avatar')
      expect(typeof props.ref).toBe('function')
      expect(typeof props.onChange).toBe('function')
      expect(typeof props.onBlur).toBe('function')
    })

    it('register documents with multiple: true includes multiple: true', () => {
      const { result } = renderHook(() =>
        useForm<FileForm>({
          defaultValues: fileDefaults,
        }),
      )

      const props = result.current.register('documents', { type: 'file', multiple: true })
      expect(props.multiple).toBe(true)
      expect(props.value).toBeUndefined()
      expect(props.checked).toBeUndefined()
    })

    it('passes accept through to file register props', () => {
      const { result } = renderHook(() =>
        useForm<FileForm>({
          defaultValues: fileDefaults,
        }),
      )

      const props = result.current.register('avatar', {
        type: 'file',
        accept: 'image/png,image/jpeg',
      })
      expect(props.accept).toBe('image/png,image/jpeg')
    })

    it('text register still has value', () => {
      const { result } = renderHook(() =>
        useForm<FileForm>({
          defaultValues: { ...fileDefaults, name: 'Vano' },
        }),
      )

      const props = result.current.register('name')
      expect(props.value).toBe('Vano')
      expect(props.multiple).toBeUndefined()
      expect(props.accept).toBeUndefined()
    })
  })

  describe('file values', () => {
    function attachFiles(input: HTMLInputElement, files: File[] | null): void {
      if (files === null) {
        Object.defineProperty(input, 'files', {
          configurable: true,
          value: null,
        })
        return
      }

      Object.defineProperty(input, 'files', {
        configurable: true,
        value: {
          ...Object.fromEntries(files.map((file, index) => [index, file])),
          length: files.length,
          item: (i: number) => files[i] ?? null,
          [Symbol.iterator]: function* () {
            yield* files
          },
        },
      })
    }

    it('onChange with FileList-like files on input type=file stores a File', () => {
      const { result } = renderHook(() =>
        useForm<FileForm>({
          defaultValues: fileDefaults,
        }),
      )

      const file = createTestFile()
      const input = document.createElement('input')
      input.type = 'file'
      attachFiles(input, [file])

      act(() => {
        result.current.register('avatar', { type: 'file' }).onChange(asChangeEvent(input))
      })

      expect(result.current.values.avatar).toBe(file)
      expect(result.current.values.avatar).toBeInstanceOf(File)
    })

    it('empty files become null for single and [] for multiple', () => {
      const { result } = renderHook(() =>
        useForm<FileForm>({
          defaultValues: {
            ...fileDefaults,
            avatar: createTestFile(),
            documents: [createTestFile('a.pdf', 'application/pdf')],
          },
        }),
      )

      const singleInput = document.createElement('input')
      singleInput.type = 'file'
      attachFiles(singleInput, [])

      act(() => {
        result.current.register('avatar', { type: 'file' }).onChange(asChangeEvent(singleInput))
      })
      expect(result.current.values.avatar).toBeNull()

      const multiInput = document.createElement('input')
      multiInput.type = 'file'
      multiInput.multiple = true
      attachFiles(multiInput, null)

      act(() => {
        result.current
          .register('documents', { type: 'file', multiple: true })
          .onChange(asChangeEvent(multiInput))
      })
      expect(result.current.values.documents).toEqual([])
    })

    it('never stores FileList in form values', () => {
      const { result } = renderHook(() =>
        useForm<FileForm>({
          defaultValues: fileDefaults,
        }),
      )

      const file = createTestFile()
      const input = document.createElement('input')
      input.type = 'file'
      const list = {
        0: file,
        length: 1,
        item: (i: number) => (i === 0 ? file : null),
        [Symbol.iterator]: function* () {
          yield file
        },
      }
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: list,
      })

      act(() => {
        result.current.register('avatar', { type: 'file' }).onChange(asChangeEvent(input))
      })
      expect(result.current.values.avatar).toBe(file)
      expect(result.current.values.avatar).not.toBe(list)

      act(() => {
        result.current
          .register('documents', { type: 'file', multiple: true })
          .onChange(asChangeEvent(input))
      })
      expect(Array.isArray(result.current.values.documents)).toBe(true)
      expect(result.current.values.documents).toEqual([file])
      expect(result.current.values.documents).not.toBe(list as never)
    })

    it('nested profile.avatar works through register onChange', () => {
      const { result } = renderHook(() =>
        useForm<FileForm>({
          defaultValues: fileDefaults,
        }),
      )

      const file = createTestFile('nested.png')
      const input = document.createElement('input')
      input.type = 'file'
      attachFiles(input, [file])

      act(() => {
        result.current.register('profile.avatar', { type: 'file' }).onChange(asChangeEvent(input))
      })

      expect(result.current.values.profile.avatar).toBe(file)
    })

    it('setValue can assign avatar File or null', () => {
      const { result } = renderHook(() =>
        useForm<FileForm>({
          defaultValues: fileDefaults,
        }),
      )

      const file = createTestFile()
      act(() => {
        result.current.setValue('avatar', file)
      })
      expect(result.current.values.avatar).toBe(file)

      act(() => {
        result.current.setValue('avatar', null)
      })
      expect(result.current.values.avatar).toBeNull()
    })
  })

  describe('file dirty state', () => {
    it('null → File marks the field dirty', () => {
      const { result } = renderHook(() =>
        useForm<FileForm>({
          defaultValues: fileDefaults,
        }),
      )

      expect(result.current.isDirty).toBe(false)

      act(() => {
        result.current.setValue('avatar', createTestFile())
      })

      expect(result.current.dirtyFields.avatar).toBe(true)
      expect(result.current.isDirty).toBe(true)
    })

    it('File → null becomes clean when default is null', () => {
      const { result } = renderHook(() =>
        useForm<FileForm>({
          defaultValues: fileDefaults,
        }),
      )

      act(() => {
        result.current.setValue('avatar', createTestFile())
      })
      expect(result.current.isDirty).toBe(true)

      act(() => {
        result.current.setValue('avatar', null)
      })
      expect(result.current.dirtyFields.avatar).toBeUndefined()
      expect(result.current.isDirty).toBe(false)
    })

    it('two distinct Files with same name/type stay dirty when replaced', () => {
      const first = createTestFile('avatar.png', 'image/png', 'one')
      const second = createTestFile('avatar.png', 'image/png', 'two')

      const { result } = renderHook(() =>
        useForm<FileForm>({
          defaultValues: { ...fileDefaults, avatar: first },
        }),
      )

      expect(result.current.isDirty).toBe(false)

      act(() => {
        result.current.setValue('avatar', second)
      })

      expect(result.current.values.avatar).toBe(second)
      expect(result.current.dirtyFields.avatar).toBe(true)
      expect(result.current.isDirty).toBe(true)
    })

    it('File[] reorder is dirty (leafValuesEqual identity)', () => {
      const a = createTestFile('a.png')
      const b = createTestFile('b.png')

      const { result } = renderHook(() =>
        useForm<FileForm>({
          defaultValues: { ...fileDefaults, documents: [a, b] },
        }),
      )

      expect(result.current.isDirty).toBe(false)

      act(() => {
        result.current.setValue('documents', [b, a])
      })

      expect(result.current.dirtyFields.documents).toBe(true)
      expect(result.current.isDirty).toBe(true)
    })
  })

  describe('file validation', () => {
    it('rules.required rejects a missing avatar', async () => {
      const { result } = renderHook(() =>
        useForm<FileForm>({
          defaultValues: fileDefaults,
          rules: {
            avatar: rules.required('Avatar required'),
          },
        }),
      )

      await act(async () => {
        await result.current.validateField('avatar')
      })

      expect(result.current.errors.avatar).toBe('Avatar required')

      act(() => {
        result.current.setValue('avatar', createTestFile())
      })

      await act(async () => {
        await result.current.validateField('avatar')
      })

      expect(result.current.errors.avatar).toBeUndefined()
    })

    it('rules.fileSize rejects oversized files', async () => {
      const { result } = renderHook(() =>
        useForm<FileForm>({
          defaultValues: {
            ...fileDefaults,
            avatar: createTestFile('big.png', 'image/png', 'x'.repeat(20)),
          },
          rules: {
            avatar: rules.fileSize(10, 'Too large'),
          },
        }),
      )

      await act(async () => {
        await result.current.validateField('avatar')
      })

      expect(result.current.errors.avatar).toBe('Too large')
    })

    it('rules.fileType rejects disallowed MIME types', async () => {
      const { result } = renderHook(() =>
        useForm<FileForm>({
          defaultValues: {
            ...fileDefaults,
            avatar: createTestFile('doc.pdf', 'application/pdf'),
          },
          rules: {
            avatar: rules.fileType(['image/png'], 'Wrong type'),
          },
        }),
      )

      await act(async () => {
        await result.current.validateField('avatar')
      })

      expect(result.current.errors.avatar).toBe('Wrong type')
    })

    it('rules.fileExtension rejects disallowed extensions', async () => {
      const { result } = renderHook(() =>
        useForm<FileForm>({
          defaultValues: {
            ...fileDefaults,
            avatar: createTestFile('notes.txt', 'text/plain'),
          },
          rules: {
            avatar: rules.fileExtension(['png', 'jpg'], 'Wrong extension'),
          },
        }),
      )

      await act(async () => {
        await result.current.validateField('avatar')
      })

      expect(result.current.errors.avatar).toBe('Wrong extension')
    })

    it('rules.maxFiles and rules.minFiles enforce array length', async () => {
      const files = [createTestFile('a.png'), createTestFile('b.png'), createTestFile('c.png')]

      const { result } = renderHook(() =>
        useForm<FileForm>({
          defaultValues: { ...fileDefaults, documents: files },
          rules: {
            documents: [rules.maxFiles(2, 'Max 2'), rules.minFiles(2, 'Min 2')],
          },
        }),
      )

      await act(async () => {
        await result.current.validateField('documents')
      })
      expect(result.current.errors.documents).toBe('Max 2')

      act(() => {
        result.current.setValue('documents', [files[0]!])
      })

      await act(async () => {
        await result.current.validateField('documents')
      })
      expect(result.current.errors.documents).toBe('Min 2')

      act(() => {
        result.current.setValue('documents', [files[0]!, files[1]!])
      })

      await act(async () => {
        await result.current.validateField('documents')
      })
      expect(result.current.errors.documents).toBeUndefined()
    })

    it('rules.eachFile runs a per-file rule', async () => {
      const { result } = renderHook(() =>
        useForm<FileForm>({
          defaultValues: {
            ...fileDefaults,
            documents: [
              createTestFile('ok.png', 'image/png'),
              createTestFile('bad.exe', 'application/octet-stream'),
            ],
          },
          rules: {
            documents: rules.eachFile((file) =>
              file.name.endsWith('.exe') ? 'No executables' : undefined,
            ),
          },
        }),
      )

      await act(async () => {
        await result.current.validateField('documents')
      })

      expect(result.current.errors.documents).toBe('No executables')
    })

    it('custom rule receives File | null at runtime', async () => {
      const seen: Array<File | null> = []
      const avatarRule = createRule<File | null, FileForm>((value) => {
        seen.push(value)
        return value && value.name.startsWith('bad') ? 'Bad avatar' : undefined
      })

      const { result } = renderHook(() =>
        useForm<FileForm>({
          defaultValues: {
            ...fileDefaults,
            avatar: createTestFile('bad-photo.png'),
          },
          rules: {
            avatar: avatarRule,
          },
        }),
      )

      await act(async () => {
        await result.current.validateField('avatar')
      })

      expect(seen[0]).toBeInstanceOf(File)
      expect(result.current.errors.avatar).toBe('Bad avatar')

      act(() => {
        result.current.setValue('avatar', null)
      })

      await act(async () => {
        await result.current.validateField('avatar')
      })

      expect(seen.at(-1)).toBeNull()
      expect(result.current.errors.avatar).toBeUndefined()
    })
  })

  describe('file reset', () => {
    it('resetField(avatar) restores null and clears the native input via ref', () => {
      const { result } = renderHook(() =>
        useForm<FileForm>({
          defaultValues: fileDefaults,
        }),
      )

      const input = document.createElement('input')
      input.type = 'file'
      const valueSetter = vi.spyOn(input, 'value', 'set')

      const props = result.current.register('avatar', { type: 'file' })
      act(() => {
        props.ref(input)
        result.current.setValue('avatar', createTestFile())
      })

      expect(result.current.values.avatar).toBeInstanceOf(File)

      act(() => {
        result.current.resetField('avatar')
      })

      expect(result.current.values.avatar).toBeNull()
      expect(valueSetter).toHaveBeenCalledWith('')
      expect(input.value).toBe('')
    })

    it('reset() clears native file inputs', () => {
      const { result } = renderHook(() =>
        useForm<FileForm>({
          defaultValues: fileDefaults,
        }),
      )

      const input = document.createElement('input')
      input.type = 'file'
      const valueSetter = vi.spyOn(input, 'value', 'set')

      act(() => {
        result.current.register('avatar', { type: 'file' }).ref(input)
        result.current.setValue('avatar', createTestFile())
        result.current.setValue('name', 'Vano')
      })

      act(() => {
        result.current.reset()
      })

      expect(result.current.values).toEqual(fileDefaults)
      expect(valueSetter).toHaveBeenCalledWith('')
    })

    it('nested resetField(profile.avatar) restores null', () => {
      const { result } = renderHook(() =>
        useForm<FileForm>({
          defaultValues: fileDefaults,
        }),
      )

      const input = document.createElement('input')
      input.type = 'file'
      const valueSetter = vi.spyOn(input, 'value', 'set')

      act(() => {
        result.current.register('profile.avatar', { type: 'file' }).ref(input)
        result.current.setValue('profile.avatar', createTestFile('nested.png'))
      })

      act(() => {
        result.current.resetField('profile.avatar')
      })

      expect(result.current.values.profile.avatar).toBeNull()
      expect(valueSetter).toHaveBeenCalledWith('')
    })
  })

  describe('file submission', () => {
    it('onSubmit receives File and File[]', async () => {
      const avatar = createTestFile()
      const documents = [
        createTestFile('a.pdf', 'application/pdf'),
        createTestFile('b.pdf', 'application/pdf'),
      ]
      const onSubmit = vi.fn()

      const { result } = renderHook(() =>
        useForm<FileForm>({
          defaultValues: {
            ...fileDefaults,
            name: 'Vano',
            avatar,
            documents,
          },
          onSubmit,
        }),
      )

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Vano',
          avatar,
          documents,
        }),
        expect.objectContaining({
          setError: expect.any(Function),
        }),
      )
      expect(onSubmit.mock.calls[0]![0].avatar).toBeInstanceOf(File)
      expect(Array.isArray(onSubmit.mock.calls[0]![0].documents)).toBe(true)
    })

    it('invalid file size blocks submit', async () => {
      const onSubmit = vi.fn()
      const { result } = renderHook(() =>
        useForm<FileForm>({
          defaultValues: {
            ...fileDefaults,
            avatar: createTestFile('big.png', 'image/png', 'x'.repeat(50)),
          },
          rules: {
            avatar: rules.fileSize(10, 'Too large'),
          },
          onSubmit,
        }),
      )

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(onSubmit).not.toHaveBeenCalled()
      expect(result.current.errors.avatar).toBe('Too large')
      expect(result.current.isSubmitted).toBe(true)
    })
  })

  describe('file accessibility', () => {
    it('exposes aria-invalid, getFieldId, and getErrorId for avatar', () => {
      const { result } = renderHook(() =>
        useForm<FileForm>({
          id: 'upload',
          defaultValues: fileDefaults,
        }),
      )

      expect(result.current.getFieldId('avatar')).toBe('upload-field-avatar')
      expect(result.current.getErrorId('avatar')).toBe('upload-error-avatar')

      act(() => {
        result.current.setError('avatar', 'Required')
      })

      const props = result.current.register('avatar', { type: 'file' })
      expect(props['aria-invalid']).toBe(true)
      expect(props['aria-describedby']).toBe('upload-error-avatar')
      expect(props.id).toBe('upload-field-avatar')
    })
  })

  describe('dependent fields', () => {
    it('does not show a confirm-password error before the dependent is touched', async () => {
      const { result } = renderHook(() =>
        useForm<{ password: string; confirmPassword: string }>({
          defaultValues: { password: '', confirmPassword: '' },
          dependencies: { confirmPassword: ['password'] },
          fieldValidators: {
            confirmPassword: (value, values) =>
              value === values.password ? undefined : 'Passwords must match',
          },
        }),
      )

      act(() => {
        result.current.setValue('password', 'new-password')
      })

      await Promise.resolve()
      expect(result.current.errors.confirmPassword).toBeUndefined()
      expect(result.current.touched.confirmPassword).toBeUndefined()
    })

    it('revalidates a dependent after blur and clears its error when fields match', async () => {
      const { result } = renderHook(() =>
        useForm<{ password: string; confirmPassword: string }>({
          defaultValues: { password: 'one', confirmPassword: 'two' },
          dependencies: { confirmPassword: ['password'] },
          fieldValidators: {
            confirmPassword: (value, values) =>
              value === values.password ? undefined : 'Passwords must match',
          },
        }),
      )

      act(() => {
        result.current.register('confirmPassword').onBlur({} as never)
        result.current.setValue('password', 'three')
      })

      await waitFor(() => {
        expect(result.current.touched.confirmPassword).toBe(true)
        expect(result.current.errors.confirmPassword).toBe('Passwords must match')
      })

      act(() => {
        result.current.setValue('password', 'two')
      })
      await waitFor(() => expect(result.current.errors.confirmPassword).toBeUndefined())
    })

    it('revalidates nested dependents when an ancestor source changes', async () => {
      type AddressForm = { address: { country: string; postalCode: string } }
      const { result } = renderHook(() =>
        useForm<AddressForm>({
          defaultValues: { address: { country: 'US', postalCode: 'H2X' } },
          dependencies: { 'address.postalCode': ['address.country'] },
          fieldValidators: {
            'address.postalCode': (postalCode, values) =>
              values.address.country === 'CA' && !postalCode.startsWith('H')
                ? 'Canadian postal codes start with H'
                : undefined,
          },
        }),
      )

      await act(async () => {
        await result.current.validateField('address.postalCode')
      })
      act(() => {
        result.current.setValue('address', { country: 'CA', postalCode: '90210' })
      })

      await waitFor(() => {
        expect(result.current.errors['address.postalCode']).toBe(
          'Canadian postal codes start with H',
        )
      })
    })

    it('runs setValues dependent revalidation as one batch', async () => {
      const validator = vi.fn((value: string, values: { a: string; b: string; c: string }) =>
        value === values.a && value === values.b ? undefined : 'Mismatch',
      )
      const { result } = renderHook(() =>
        useForm<{ a: string; b: string; c: string }>({
          defaultValues: { a: '', b: '', c: '' },
          dependencies: { c: ['a', 'b'] },
          fieldValidators: { c: validator },
        }),
      )

      await act(async () => {
        await result.current.validateField('c')
      })
      validator.mockClear()
      act(() => {
        result.current.setValues({ a: 'same', b: 'same', c: 'same' })
      })

      await waitFor(() => {
        expect(validator).toHaveBeenCalledTimes(1)
      })
    })

    it('ignores stale async dependent validation results', async () => {
      let resolveFirst!: (message: string | undefined) => void
      const first = new Promise<string | undefined>((resolve) => {
        resolveFirst = resolve
      })
      let calls = 0
      const { result } = renderHook(() =>
        useForm<{ source: string; dependent: string }>({
          defaultValues: { source: '', dependent: '' },
          dependencies: { dependent: ['source'] },
          dependencyMode: 'always',
          fieldValidators: {
            dependent: async () => {
              calls += 1
              return calls === 1 ? first : undefined
            },
          },
        }),
      )

      act(() => {
        result.current.setValue('source', 'first')
        result.current.setValue('source', 'second')
      })
      await waitFor(() => {
        expect(calls).toBe(2)
      })
      resolveFirst('stale')

      await waitFor(() => {
        expect(result.current.errors.dependent).toBeUndefined()
      })
    })

    it('revalidates transitive dependents and cycles once each', async () => {
      const b = vi.fn(() => undefined)
      const c = vi.fn(() => undefined)
      const { result } = renderHook(() =>
        useForm<{ a: string; b: string; c: string }>({
          defaultValues: { a: '', b: '', c: '' },
          dependencies: { b: ['a', 'c'], c: ['b'] },
          dependencyMode: 'always',
          fieldValidators: { b, c },
        }),
      )

      act(() => {
        result.current.setValue('a', 'changed')
      })

      await waitFor(() => {
        expect(b).toHaveBeenCalledTimes(1)
        expect(c).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('schema resolvers', () => {
    it('keeps input values unchanged while submitting transformed resolver output', async () => {
      const onSubmit = vi.fn()
      const { result } = renderHook(() =>
        useForm<{ age: string }, { age: number }>({
          defaultValues: { age: '42' },
          resolver: (values) => ({ success: true, values: { age: Number(values.age) } }),
          onSubmit,
        }),
      )

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(result.current.values.age).toBe('42')
      expect(onSubmit).toHaveBeenCalledWith({ age: 42 }, expect.any(Object))
    })

    it('places resolver failures in form state and prevents submission', async () => {
      const onSubmit = vi.fn()
      const { result } = renderHook(() =>
        useForm<{ email: string }>({
          defaultValues: { email: '' },
          resolver: () => ({ success: false, errors: { email: 'Required by schema' } }),
          onSubmit,
        }),
      )

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(result.current.errors.email).toBe('Required by schema')
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('does not let a stale resolver submit or overwrite a newer validation', async () => {
      let releaseFirst!: () => void
      const first = new Promise<void>((resolve) => {
        releaseFirst = resolve
      })
      let calls = 0
      const onSubmit = vi.fn()
      const { result } = renderHook(() =>
        useForm<{ email: string }>({
          defaultValues: { email: 'first@example.com' },
          resolver: async () => {
            calls += 1
            if (calls === 1) {
              await first
              return { success: true as const, values: { email: 'first@example.com' } }
            }
            return { success: false as const, errors: { email: 'new resolver error' } }
          },
          onSubmit,
        }),
      )

      let staleSubmit!: Promise<void>
      act(() => {
        staleSubmit = result.current.handleSubmit()
      })
      await waitFor(() => {
        expect(calls).toBe(1)
      })
      act(() => {
        result.current.reset({ email: 'second@example.com' })
      })
      await act(async () => {
        await result.current.validate()
      })
      expect(result.current.errors.email).toBe('new resolver error')

      releaseFirst()
      await act(async () => {
        await staleSubmit
      })

      expect(result.current.errors.email).toBe('new resolver error')
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('passes resolver context without resetting values when context changes', async () => {
      const seen: number[] = []
      const resolver = (
        values: Readonly<{ name: string }>,
        options: { context: { minimum: number } },
      ) => {
        seen.push(options.context.minimum)
        return { success: true as const, values: { ...values } }
      }
      const { result, rerender } = renderHook(
        ({ context }) =>
          useForm<{ name: string }, { name: string }, { minimum: number }>({
            defaultValues: { name: 'initial' },
            resolver,
            resolverContext: context,
          }),
        { initialProps: { context: { minimum: 1 } } },
      )

      act(() => {
        result.current.setValue('name', 'kept')
      })
      rerender({ context: { minimum: 2 } })
      await act(async () => {
        await result.current.validate()
      })

      expect(result.current.values.name).toBe('kept')
      expect(seen).toEqual([2])
    })

    it('lets rules and form validation override resolver messages', async () => {
      const { result } = renderHook(() =>
        useForm<{ email: string }>({
          defaultValues: { email: '' },
          rules: { email: rules.required('From rules') },
          validate: () => ({ email: 'From form validate' }),
          resolver: () => ({ success: false, errors: { email: 'From resolver' } }),
        }),
      )

      await act(async () => {
        await result.current.validate()
      })

      expect(result.current.errors.email).toBe('From form validate')
    })

    it('accepts nested and indexed resolver error paths', async () => {
      type Order = { customer: { name: string }; products: Array<{ name: string }> }
      const { result } = renderHook(() =>
        useForm<Order>({
          defaultValues: { customer: { name: '' }, products: [{ name: '' }] },
          resolver: () => ({
            success: false,
            errors: {
              'customer.name': 'Customer required',
              'products.0.name': 'Product required',
            },
          }),
        }),
      )

      await act(async () => {
        await result.current.validate()
      })

      expect(result.current.errors['customer.name']).toBe('Customer required')
      expect(result.current.errors['products.0.name']).toBe('Product required')
    })

    it('uses resolvers for validate and validateField', async () => {
      const resolver = vi.fn((values: Readonly<{ email: string }>) =>
        values.email
          ? { success: true as const, values: { ...values } }
          : {
              success: false as const,
              errors: { email: 'Required by schema' },
            },
      )
      const { result } = renderHook(() =>
        useForm<{ email: string }>({ defaultValues: { email: '' }, resolver }),
      )

      await act(async () => {
        expect(await result.current.validate()).toBe(false)
      })
      expect(result.current.errors.email).toBe('Required by schema')

      act(() => {
        result.current.setValue('email', 'valid@example.com')
      })
      await act(async () => {
        expect(await result.current.validateField('email')).toBe(true)
      })
      expect(result.current.errors.email).toBeUndefined()
      expect(resolver).toHaveBeenCalledTimes(2)
    })

    it('is safe to unmount while a resolver is pending', async () => {
      let release!: () => void
      const pending = new Promise<void>((resolve) => {
        release = resolve
      })
      const { result, unmount } = renderHook(() =>
        useForm<{ email: string }>({
          defaultValues: { email: '' },
          resolver: async () => {
            await pending
            return { success: false as const, errors: { email: 'Late error' } }
          },
        }),
      )

      let validation!: Promise<boolean>
      act(() => {
        validation = result.current.validate()
      })
      unmount()
      release()

      await expect(validation).resolves.toBeTypeOf('boolean')
    })

    it('propagates unexpected resolver errors from validate', async () => {
      const { result } = renderHook(() =>
        useForm<{ email: string }>({
          defaultValues: { email: '' },
          resolver: () => {
            throw new Error('resolver exploded')
          },
        }),
      )

      await expect(
        act(async () => {
          await result.current.validate()
        }),
      ).rejects.toThrow('resolver exploded')
    })
  })

  describe('rootError preflight', () => {
    const failingRootResolver = async () => ({
      success: false as const,
      errors: {} as FieldErrors<{ email: string }>,
      rootError: 'Combination invalid',
    })

    it('clears rootError after successful complete validation', async () => {
      let fail = true
      const { result } = renderHook(() =>
        useForm<{ email: string }>({
          defaultValues: { email: 'a@b.com' },
          resolver: async () => {
            if (fail) {
              return {
                success: false,
                errors: {},
                rootError: 'Combination invalid',
              }
            }
            return { success: true, values: { email: 'a@b.com' } }
          },
        }),
      )

      await act(async () => {
        await result.current.validate()
      })
      expect(result.current.rootError).toBe('Combination invalid')
      expect(result.current.isValid).toBe(false)

      fail = false
      await act(async () => {
        await result.current.validate()
      })
      expect(result.current.rootError).toBeUndefined()
      expect(result.current.isValid).toBe(true)
    })

    it('clearErrors clears rootError; clearRootError leaves field errors', async () => {
      const { result } = renderHook(() =>
        useForm<{ email: string }>({
          defaultValues: { email: '' },
          resolver: failingRootResolver,
        }),
      )

      await act(async () => {
        await result.current.validate()
        result.current.setError('email', 'Required')
      })
      expect(result.current.rootError).toBe('Combination invalid')

      act(() => {
        result.current.clearRootError()
      })
      expect(result.current.rootError).toBeUndefined()
      expect(result.current.errors.email).toBe('Required')

      await act(async () => {
        await result.current.validate()
      })
      act(() => {
        result.current.clearErrors()
      })
      expect(result.current.rootError).toBeUndefined()
      expect(result.current.errors).toEqual({})
    })

    it('setErrors does not erase an unrelated rootError', async () => {
      const { result } = renderHook(() =>
        useForm<{ email: string }>({
          defaultValues: { email: '' },
          resolver: failingRootResolver,
        }),
      )

      await act(async () => {
        await result.current.validate()
      })
      act(() => {
        result.current.setErrors({ email: 'From backend' })
      })
      expect(result.current.rootError).toBe('Combination invalid')
      expect(result.current.errors.email).toBe('From backend')
    })

    it('reset clears rootError unless keepErrors', async () => {
      const { result } = renderHook(() =>
        useForm<{ email: string }>({
          defaultValues: { email: '' },
          resolver: failingRootResolver,
        }),
      )

      await act(async () => {
        await result.current.validate()
      })
      act(() => {
        result.current.reset()
      })
      expect(result.current.rootError).toBeUndefined()

      await act(async () => {
        await result.current.validate()
      })
      act(() => {
        result.current.reset(undefined, { keepErrors: true })
      })
      expect(result.current.rootError).toBe('Combination invalid')
    })

    it('field validation success does not clear an unrelated rootError', async () => {
      const { result } = renderHook(() =>
        useForm<{ email: string }>({
          defaultValues: { email: 'a@b.com' },
          rules: { email: rules.email() },
          resolver: failingRootResolver,
        }),
      )

      await act(async () => {
        await result.current.validate()
      })
      expect(result.current.rootError).toBe('Combination invalid')

      await act(async () => {
        await result.current.validateField('email')
      })
      expect(result.current.rootError).toBe('Combination invalid')
      expect(result.current.errors.email).toBeUndefined()
    })
  })

  describe('debounced async validation', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('debounces change validation and runs only the latest value', async () => {
      vi.useFakeTimers()
      const remote = vi.fn(async (username: string) =>
        username === 'taken' ? 'Username is already taken' : undefined,
      )

      const { result } = renderHook(() =>
        useForm<{ username: string }>({
          defaultValues: { username: '' },
          mode: ValidationMode.OnChange,
          rules: {
            username: [
              rules.required(),
              rules.minLength(3),
              rules.async(async (value) => remote(value), {
                debounce: 400,
                validateEmpty: false,
              }),
            ],
          },
          onSubmit: () => undefined,
        }),
      )

      act(() => {
        result.current.setValue('username', 'ta')
      })
      await act(async () => {
        await Promise.resolve()
      })
      expect(result.current.errors.username).toMatch(/at least 3/i)
      expect(remote).not.toHaveBeenCalled()
      expect(result.current.isValidating).toBe(false)

      act(() => {
        result.current.setValue('username', 'tak')
        result.current.setValue('username', 'take')
        result.current.setValue('username', 'taken')
      })
      await act(async () => {
        await Promise.resolve()
      })
      expect(remote).not.toHaveBeenCalled()
      expect(result.current.isValidating).toBe(false)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(400)
      })

      expect(remote).toHaveBeenCalledTimes(1)
      expect(remote).toHaveBeenCalledWith('taken')
      expect(result.current.errors.username).toBe('Username is already taken')
      expect(result.current.isValidating).toBe(false)
    })

    it('keeps ordinary async validators immediate on change', async () => {
      const remote = vi.fn(async () => 'slow')
      const { result } = renderHook(() =>
        useForm<{ code: string }>({
          defaultValues: { code: 'x' },
          mode: ValidationMode.OnChange,
          rules: {
            code: [async () => remote()],
          },
          onSubmit: () => undefined,
        }),
      )

      await act(async () => {
        result.current.setValue('code', 'y')
      })

      await waitFor(() => {
        expect(remote).toHaveBeenCalledTimes(1)
        expect(result.current.errors.code).toBe('slow')
      })
    })

    it('bypasses debounce on blur, validateField, and submit', async () => {
      vi.useFakeTimers()
      const remote = vi.fn(async () => 'remote')

      const { result } = renderHook(() =>
        useForm<{ username: string }>({
          defaultValues: { username: 'alice' },
          mode: ValidationMode.OnChange,
          rules: {
            username: [rules.async(async () => remote(), { debounce: 500 })],
          },
          onSubmit: () => undefined,
        }),
      )

      act(() => {
        result.current.setValue('username', 'bob')
      })
      await act(async () => {
        await Promise.resolve()
      })
      expect(remote).not.toHaveBeenCalled()

      await act(async () => {
        const props = result.current.getFieldProps('username')
        props.onBlur({} as never)
        await Promise.resolve()
      })
      expect(remote).toHaveBeenCalledTimes(1)

      remote.mockClear()
      act(() => {
        result.current.setValue('username', 'carol')
      })
      await act(async () => {
        await result.current.validateField('username')
      })
      expect(remote).toHaveBeenCalledTimes(1)

      remote.mockClear()
      act(() => {
        result.current.setValue('username', 'dave')
      })
      await act(async () => {
        await Promise.resolve()
        await result.current.handleSubmit()
      })
      expect(remote).toHaveBeenCalledTimes(1)
    })

    it('cancels pending debounce on reset and unmount', async () => {
      vi.useFakeTimers()
      const remote = vi.fn(async () => 'remote')

      const { result, unmount } = renderHook(() =>
        useForm<{ username: string }>({
          defaultValues: { username: 'alice' },
          mode: ValidationMode.OnChange,
          rules: {
            username: [rules.async(async () => remote(), { debounce: 400 })],
          },
          onSubmit: () => undefined,
        }),
      )

      act(() => {
        result.current.setValue('username', 'bob')
      })
      await act(async () => {
        await Promise.resolve()
      })
      act(() => {
        result.current.reset()
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(400)
      })
      expect(remote).not.toHaveBeenCalled()

      act(() => {
        result.current.setValue('username', 'carol')
      })
      await act(async () => {
        await Promise.resolve()
      })
      unmount()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(400)
      })
      expect(remote).not.toHaveBeenCalled()
    })

    it('aborts in-flight work so stale results cannot commit', async () => {
      let releaseFirst!: () => void
      const firstGate = new Promise<void>((resolve) => {
        releaseFirst = resolve
      })
      const remote = vi
        .fn()
        .mockImplementationOnce(
          async (_value: string, _values: unknown, context: { signal?: AbortSignal }) => {
            await firstGate
            if (context.signal?.aborted) {
              const error = new Error('Aborted')
              error.name = 'AbortError'
              throw error
            }
            return 'stale'
          },
        )
        .mockImplementationOnce(async () => 'fresh')

      const { result } = renderHook(() =>
        useForm<{ username: string }>({
          defaultValues: { username: 'aaaa' },
          mode: ValidationMode.OnChange,
          rules: {
            username: [
              rules.async(async (v, values, ctx) => remote(v, values, ctx), { debounce: 0 }),
            ],
          },
          onSubmit: () => undefined,
        }),
      )

      await act(async () => {
        result.current.setValue('username', 'first')
        await Promise.resolve()
      })

      await act(async () => {
        result.current.setValue('username', 'second')
        await Promise.resolve()
      })

      releaseFirst()
      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })

      await waitFor(() => {
        expect(result.current.errors.username).toBe('fresh')
      })
    })

    it('debounces dependency-driven validation', async () => {
      vi.useFakeTimers()
      const remote = vi.fn(async (_value: string, values: { username: string; status: string }) =>
        values.username === 'taken' ? 'Unavailable' : undefined,
      )

      const { result } = renderHook(() =>
        useForm<{ username: string; status: string }>({
          defaultValues: { username: 'ok', status: 'pending' },
          mode: ValidationMode.OnSubmit,
          dependencies: { status: ['username'] },
          dependencyMode: 'always',
          rules: {
            status: [
              rules.async(async (value, values) => remote(value, values), { debounce: 300 }),
            ],
          },
          onSubmit: () => undefined,
        }),
      )

      act(() => {
        result.current.setValue('username', 'taken', { shouldValidate: false })
      })
      await act(async () => {
        await Promise.resolve()
      })
      expect(remote).not.toHaveBeenCalled()

      act(() => {
        result.current.setValue('username', 'taken')
      })
      await act(async () => {
        await Promise.resolve()
      })
      expect(remote).not.toHaveBeenCalled()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(300)
      })

      expect(remote).toHaveBeenCalled()
      expect(result.current.errors.status).toBe('Unavailable')
    })
  })

  describe('async default values', () => {
    it('keeps sync forms ready without loading', () => {
      const { result } = renderHook(() =>
        useForm<{ email: string }>({
          defaultValues: { email: '' },
        }),
      )

      expect(result.current.isLoadingDefaults).toBe(false)
      expect(result.current.isDefaultsReady).toBe(true)
      expect(result.current.defaultValuesError).toBeUndefined()
      expect(result.current.values).toEqual({ email: '' })
    })

    it('starts loading after mount with complete fallback values', async () => {
      let resolveLoad!: (value: { name: string; email: string }) => void
      const pending = new Promise<{ name: string; email: string }>((resolve) => {
        resolveLoad = resolve
      })

      const { result } = renderHook(() =>
        useForm<{ name: string; email: string }>({
          defaultValues: { name: '', email: '' },
          loadDefaultValues: async () => pending,
        }),
      )

      expect(result.current.isLoadingDefaults).toBe(true)
      expect(result.current.isDefaultsReady).toBe(false)
      expect(result.current.values).toEqual({ name: '', email: '' })

      await act(async () => {
        resolveLoad({ name: 'Server', email: 'server@example.com' })
        await pending
      })

      expect(result.current.isLoadingDefaults).toBe(false)
      expect(result.current.isDefaultsReady).toBe(true)
      expect(result.current.values).toEqual({ name: 'Server', email: 'server@example.com' })
      expect(result.current.defaultValues).toEqual({
        name: 'Server',
        email: 'server@example.com',
      })
      expect(result.current.isDirty).toBe(false)
    })

    it('preserves dirty user edits while applying pristine loaded fields', async () => {
      let resolveLoad!: (value: {
        name: string
        email: string
        address: { city: string; country: string }
      }) => void
      const pending = new Promise<{
        name: string
        email: string
        address: { city: string; country: string }
      }>((resolve) => {
        resolveLoad = resolve
      })

      const { result } = renderHook(() =>
        useForm<{
          name: string
          email: string
          address: { city: string; country: string }
        }>({
          defaultValues: {
            name: '',
            email: '',
            address: { city: '', country: '' },
          },
          loadDefaultValues: async () => pending,
        }),
      )

      act(() => {
        result.current.setValue('name', 'Local edit')
        result.current.setValue('address.city', 'Local city')
      })

      await act(async () => {
        resolveLoad({
          name: 'Server name',
          email: 'server@example.com',
          address: { city: 'Server city', country: 'Armenia' },
        })
        await pending
      })

      expect(result.current.values).toEqual({
        name: 'Local edit',
        email: 'server@example.com',
        address: { city: 'Local city', country: 'Armenia' },
      })
      expect(result.current.defaultValues).toEqual({
        name: 'Server name',
        email: 'server@example.com',
        address: { city: 'Server city', country: 'Armenia' },
      })
      expect(result.current.dirtyFields.name).toBe(true)
      expect(result.current.dirtyFields['address.city']).toBe(true)
      expect(result.current.dirtyFields.email).toBeUndefined()
      expect(result.current.isDirty).toBe(true)
    })

    it('replace mode overwrites current values', async () => {
      let resolveLoad!: (value: { name: string }) => void
      const pending = new Promise<{ name: string }>((resolve) => {
        resolveLoad = resolve
      })

      const { result } = renderHook(() =>
        useForm<{ name: string }>({
          defaultValues: { name: '' },
          defaultValuesLoadMode: 'replace',
          loadDefaultValues: async () => pending,
        }),
      )

      act(() => {
        result.current.setValue('name', 'Local')
      })

      await act(async () => {
        resolveLoad({ name: 'Server' })
        await pending
      })

      expect(result.current.values.name).toBe('Server')
      expect(result.current.isDirty).toBe(false)
    })

    it('stores load failures separately and supports retry', async () => {
      let shouldFail = true
      const { result } = renderHook(() =>
        useForm<{ name: string }>({
          defaultValues: { name: '' },
          loadDefaultValues: async () => {
            if (shouldFail) {
              throw new Error('network down')
            }
            return { name: 'Recovered' }
          },
        }),
      )

      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(result.current.isDefaultsReady).toBe(false)
      expect(result.current.defaultValuesError?.message).toBe('network down')
      expect(result.current.errors).toEqual({})
      expect(result.current.rootError).toBeUndefined()
      expect(result.current.submitError).toBeUndefined()

      shouldFail = false
      await act(async () => {
        await result.current.reloadDefaultValues()
      })

      expect(result.current.isDefaultsReady).toBe(true)
      expect(result.current.defaultValuesError).toBeUndefined()
      expect(result.current.values.name).toBe('Recovered')
    })

    it('blocks submission while loading and after failure by default', async () => {
      let resolveLoad!: (value: { name: string }) => void
      const pending = new Promise<{ name: string }>((resolve) => {
        resolveLoad = resolve
      })
      const onSubmit = vi.fn()

      const { result } = renderHook(() =>
        useForm<{ name: string }>({
          defaultValues: { name: '' },
          loadDefaultValues: async () => pending,
          onSubmit,
        }),
      )

      await act(async () => {
        await result.current.handleSubmit()
      })
      expect(onSubmit).not.toHaveBeenCalled()
      expect(result.current.submitCount).toBe(0)

      await act(async () => {
        resolveLoad({ name: 'Ready' })
        await pending
      })

      await act(async () => {
        await result.current.handleSubmit()
      })
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    it('ignores stale loads after explicit reset with new defaults', async () => {
      let resolveLoad!: (value: { name: string }) => void
      const pending = new Promise<{ name: string }>((resolve) => {
        resolveLoad = resolve
      })

      const { result } = renderHook(() =>
        useForm<{ name: string }>({
          defaultValues: { name: '' },
          loadDefaultValues: async () => pending,
        }),
      )

      act(() => {
        result.current.reset({ name: 'Explicit' })
      })
      expect(result.current.isDefaultsReady).toBe(true)
      expect(result.current.isLoadingDefaults).toBe(false)

      await act(async () => {
        resolveLoad({ name: 'Stale server' })
        await pending
      })

      expect(result.current.values.name).toBe('Explicit')
      expect(result.current.defaultValues.name).toBe('Explicit')
    })

    it('reloadDefaultValues throws when no loader is configured', async () => {
      const { result } = renderHook(() =>
        useForm<{ name: string }>({
          defaultValues: { name: '' },
        }),
      )

      await expect(
        act(async () => {
          await result.current.reloadDefaultValues()
        }),
      ).rejects.toThrow(/loadDefaultValues/)
    })

    it('reset after success restores loaded defaults', async () => {
      const { result } = renderHook(() =>
        useForm<{ name: string }>({
          defaultValues: { name: '' },
          loadDefaultValues: async () => ({ name: 'Loaded' }),
        }),
      )

      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })

      act(() => {
        result.current.setValue('name', 'Edited')
      })
      act(() => {
        result.current.reset()
      })

      expect(result.current.values.name).toBe('Loaded')
      expect(result.current.isDirty).toBe(false)
    })

    it('does not treat AbortError as a loading failure', async () => {
      const { result, unmount } = renderHook(() =>
        useForm<{ name: string }>({
          defaultValues: { name: '' },
          loadDefaultValues: async ({ signal }) => {
            await new Promise<void>((_resolve, reject) => {
              signal?.addEventListener(
                'abort',
                () => {
                  const error = new Error('Aborted')
                  error.name = 'AbortError'
                  reject(error)
                },
                { once: true },
              )
            })
            return { name: 'Never' }
          },
        }),
      )

      expect(result.current.isLoadingDefaults).toBe(true)
      unmount()
      await act(async () => {
        await Promise.resolve()
      })
    })

    it('does not clear a preserved dirty native file input after defaults load', async () => {
      let resolveLoad!: (value: FileForm) => void
      const pending = new Promise<FileForm>((resolve) => {
        resolveLoad = resolve
      })
      const selected = createTestFile('picked.png')
      const loaded = createTestFile('server.png')

      const { result } = renderHook(() =>
        useForm<FileForm>({
          defaultValues: fileDefaults,
          loadDefaultValues: async () => pending,
        }),
      )

      const input = document.createElement('input')
      input.type = 'file'
      const valueSetter = vi.spyOn(input, 'value', 'set')
      const props = result.current.register('avatar', { type: 'file' })

      act(() => {
        props.ref(input)
        attachFiles(input, [selected])
        props.onChange(asChangeEvent(input))
      })
      expect(result.current.values.avatar).toBe(selected)
      valueSetter.mockClear()

      await act(async () => {
        resolveLoad({ ...fileDefaults, name: 'Server', avatar: loaded })
        await pending
      })

      expect(result.current.values.avatar).toBe(selected)
      expect(result.current.defaultValues.avatar).toBe(loaded)
      expect(valueSetter).not.toHaveBeenCalledWith('')
    })

    it('clears a replaced pristine native file input after defaults load', async () => {
      let resolveLoad!: (value: FileForm) => void
      const pending = new Promise<FileForm>((resolve) => {
        resolveLoad = resolve
      })
      const loaded = createTestFile('server.png')

      const { result } = renderHook(() =>
        useForm<FileForm>({
          defaultValues: fileDefaults,
          loadDefaultValues: async () => pending,
        }),
      )

      const input = document.createElement('input')
      input.type = 'file'
      const valueSetter = vi.spyOn(input, 'value', 'set')
      act(() => {
        result.current.register('avatar', { type: 'file' }).ref(input)
      })
      valueSetter.mockClear()

      await act(async () => {
        resolveLoad({ ...fileDefaults, avatar: loaded })
        await pending
      })

      expect(result.current.values.avatar).toBe(loaded)
      expect(valueSetter).toHaveBeenCalledWith('')
    })

    it('keeps dirty-field errors and clears pristine replaced errors', async () => {
      let resolveLoad!: (value: { name: string; email: string }) => void
      const pending = new Promise<{ name: string; email: string }>((resolve) => {
        resolveLoad = resolve
      })

      const { result } = renderHook(() =>
        useForm<{ name: string; email: string }>({
          defaultValues: { name: '', email: '' },
          loadDefaultValues: async () => pending,
        }),
      )

      act(() => {
        result.current.setValue('name', 'Local')
        result.current.setError('name', 'too short')
        result.current.setError('email', 'required')
      })

      await act(async () => {
        resolveLoad({ name: 'Server', email: 'server@example.com' })
        await pending
      })

      expect(result.current.errors.name).toBe('too short')
      expect(result.current.errors.email).toBeUndefined()
    })

    it('validateOnDefaultsLoad runs against the merged state and still marks defaults ready', async () => {
      let resolveLoad!: (value: { name: string; email: string }) => void
      const pending = new Promise<{ name: string; email: string }>((resolve) => {
        resolveLoad = resolve
      })

      const { result } = renderHook(() =>
        useForm<{ name: string; email: string }>({
          defaultValues: { name: '', email: '' },
          validateOnDefaultsLoad: true,
          rules: {
            email: rules.email('Bad email'),
          },
          loadDefaultValues: async () => pending,
        }),
      )

      act(() => {
        result.current.setValue('name', 'Local')
      })

      await act(async () => {
        resolveLoad({ name: 'Server', email: 'not-an-email' })
        await pending
      })

      expect(result.current.values.name).toBe('Local')
      expect(result.current.values.email).toBe('not-an-email')
      expect(result.current.isDefaultsReady).toBe(true)
      expect(result.current.errors.email).toBe('Bad email')
    })

    it('explicit reset with new defaults clears defaultValuesError', async () => {
      const { result } = renderHook(() =>
        useForm<{ name: string }>({
          defaultValues: { name: '' },
          loadDefaultValues: async () => {
            throw new Error('network down')
          },
        }),
      )

      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(result.current.defaultValuesError?.message).toBe('network down')

      act(() => {
        result.current.reset({ name: 'Explicit' })
      })

      expect(result.current.defaultValuesError).toBeUndefined()
      expect(result.current.isDefaultsReady).toBe(true)
      expect(result.current.values.name).toBe('Explicit')
    })

    it('reload uses the latest loader captured after mount', async () => {
      const { result, rerender } = renderHook(
        ({ version }: { version: number }) =>
          useForm<{ name: string }>({
            defaultValues: { name: '' },
            loadDefaultValues: async () => ({ name: `v${version}` }),
          }),
        { initialProps: { version: 1 } },
      )

      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(result.current.values.name).toBe('v1')

      rerender({ version: 2 })
      await act(async () => {
        await result.current.reloadDefaultValues()
      })
      expect(result.current.values.name).toBe('v2')
    })
  })

  describe('unregister and conditional fields', () => {
    type ConditionalValues = {
      accountType: 'personal' | 'company'
      company?: { name: string; taxNumber: string }
      email: string
      plan?: string
    }

    const conditionalDefaults: ConditionalValues = {
      accountType: 'personal',
      company: { name: 'Acme', taxNumber: 'TAX-1' },
      email: 'a@b.com',
      plan: 'basic',
    }

    async function flushMicrotasks() {
      await act(async () => {
        await Promise.resolve()
      })
    }

    describe('explicit unregister', () => {
      it('preserves values by default for flat, nested, and parent paths', () => {
        const { result } = renderHook(() =>
          useForm<ConditionalValues>({ defaultValues: conditionalDefaults }),
        )

        act(() => {
          result.current.setError('company.taxNumber', 'bad tax')
          result.current.setError('email', 'bad email')
          result.current.unregister('company.taxNumber')
        })

        expect(result.current.values.company?.taxNumber).toBe('TAX-1')
        expect(result.current.errors['company.taxNumber']).toBeUndefined()
        expect(result.current.errors.email).toBe('bad email')
        expect(result.current.rootError).toBeUndefined()

        act(() => {
          result.current.setError('company.name', 'bad name')
          result.current.unregister('company')
        })

        expect(result.current.values.company).toEqual({ name: 'Acme', taxNumber: 'TAX-1' })
        expect(result.current.errors['company.name']).toBeUndefined()
        expect(result.current.errors.email).toBe('bad email')
      })

      it('unregisters several paths and honors keep options', () => {
        const { result } = renderHook(() =>
          useForm<ConditionalValues>({ defaultValues: conditionalDefaults }),
        )

        act(() => {
          result.current.setValue('email', 'touched@example.com', { shouldTouch: true })
          result.current.setError('company.name', 'bad')
          result.current.setError('email', 'also bad')
          result.current.unregister(['company.name', 'email'], {
            keepValue: true,
            keepError: true,
            keepTouched: true,
            keepValidated: true,
          })
        })

        expect(result.current.values.company?.name).toBe('Acme')
        expect(result.current.errors['company.name']).toBe('bad')
        expect(result.current.errors.email).toBe('also bad')
        expect(result.current.touched.email).toBe(true)
      })

      it('clears touched metadata and stored defaults when keep flags are false', () => {
        const { result } = renderHook(() =>
          useForm<ConditionalValues>({ defaultValues: conditionalDefaults }),
        )

        act(() => {
          result.current.setValue('email', 'touched@example.com', { shouldTouch: true })
          result.current.unregister('email')
          result.current.unregister('company', { keepValue: false, keepDefaultValue: false })
        })

        expect(result.current.touched.email).toBeUndefined()
        expect(result.current.values.email).toBe('touched@example.com')
        expect(result.current.values.company).toBeUndefined()
        expect(result.current.defaultValues.company).toBeUndefined()
      })

      it('runs validation after unregister when shouldValidate is true', async () => {
        const { result } = renderHook(() =>
          useForm<ConditionalValues>({
            defaultValues: { ...conditionalDefaults, email: '' },
            rules: { email: rules.required('Email required') },
          }),
        )

        await act(async () => {
          result.current.unregister('company', { shouldValidate: true })
        })

        expect(result.current.errors.email).toBe('Email required')
        expect(result.current.values.company).toEqual({ name: 'Acme', taxNumber: 'TAX-1' })
      })

      it('removes optional values when keepValue is false', () => {
        const { result } = renderHook(() =>
          useForm<ConditionalValues>({ defaultValues: conditionalDefaults }),
        )

        act(() => {
          result.current.setError('company.taxNumber', 'bad')
          result.current.unregister('company', { keepValue: false, keepDefaultValue: true })
        })

        expect(result.current.values.company).toBeUndefined()
        expect(result.current.defaultValues.company).toEqual({ name: 'Acme', taxNumber: 'TAX-1' })
        expect(result.current.errors['company.taxNumber']).toBeUndefined()
        expect(result.current.values.email).toBe('a@b.com')
      })

      it('is idempotent and rejects unsafe paths', () => {
        const { result } = renderHook(() =>
          useForm<ConditionalValues>({ defaultValues: conditionalDefaults }),
        )

        act(() => {
          result.current.unregister('company', { keepValue: false })
          result.current.unregister('company', { keepValue: false })
        })
        expect(result.current.values.company).toBeUndefined()

        expect(() => {
          const unsafe = result.current.unregister as (name: string) => void
          unsafe('__proto__.x')
        }).toThrow(/Unsafe form path/)
      })
    })

    describe('automatic unregister', () => {
      it('does not unregister on ref null when shouldUnregister is false', async () => {
        const { result } = renderHook(() =>
          useForm<ConditionalValues>({ defaultValues: conditionalDefaults }),
        )
        const input = document.createElement('input')
        const props = result.current.register('company.taxNumber')

        act(() => {
          props.ref(input)
          props.ref(null)
        })
        await flushMicrotasks()

        expect(result.current.values.company?.taxNumber).toBe('TAX-1')
      })

      it('removes optional values after deferred unmount when shouldUnregister is true', async () => {
        const { result } = renderHook(() =>
          useForm<ConditionalValues>({
            defaultValues: conditionalDefaults,
            shouldUnregister: true,
          }),
        )
        const input = document.createElement('input')
        const props = result.current.register('company.taxNumber')

        act(() => {
          props.ref(input)
          result.current.setValue('company.taxNumber', 'EDIT')
          props.ref(null)
        })
        await flushMicrotasks()

        expect(result.current.values.company?.taxNumber).toBeUndefined()
      })

      it('cancels deferred unregister when the element reconnects', async () => {
        const { result } = renderHook(() =>
          useForm<ConditionalValues>({
            defaultValues: conditionalDefaults,
            shouldUnregister: true,
          }),
        )
        const input = document.createElement('input')
        const first = result.current.register('company.taxNumber')
        act(() => {
          first.ref(input)
        })
        const second = result.current.register('company.taxNumber')
        act(() => {
          first.ref(null)
          second.ref(input)
        })
        await flushMicrotasks()

        expect(result.current.values.company?.taxNumber).toBe('TAX-1')
      })

      it('restores defaults when a removed field remounts', async () => {
        const { result } = renderHook(() =>
          useForm<ConditionalValues>({
            defaultValues: conditionalDefaults,
            shouldUnregister: true,
          }),
        )
        const input = document.createElement('input')
        const props = result.current.register('company', { shouldUnregister: true })
        act(() => {
          props.ref(input)
          result.current.setValue('company', { name: 'Edited', taxNumber: 'X' })
          props.ref(null)
        })
        await flushMicrotasks()
        expect(result.current.values.company).toBeUndefined()

        const remount = result.current.register('company', { shouldUnregister: true })
        act(() => {
          remount.ref(input)
        })
        expect(result.current.values.company).toEqual({ name: 'Acme', taxNumber: 'TAX-1' })
      })

      it('lets a per-field override keep a field when the form unregisters', async () => {
        const { result } = renderHook(() =>
          useForm<ConditionalValues>({
            defaultValues: conditionalDefaults,
            shouldUnregister: true,
          }),
        )
        const input = document.createElement('input')
        const props = result.current.register('email', { shouldUnregister: false })
        act(() => {
          props.ref(input)
          result.current.setValue('email', 'kept@example.com')
          props.ref(null)
        })
        await flushMicrotasks()
        expect(result.current.values.email).toBe('kept@example.com')
      })
    })

    describe('multiple elements', () => {
      it('does not unregister a radio group until every option disconnects', async () => {
        const { result } = renderHook(() =>
          useForm<ConditionalValues>({
            defaultValues: conditionalDefaults,
            shouldUnregister: true,
          }),
        )
        const basic = document.createElement('input')
        const pro = document.createElement('input')
        const basicProps = result.current.register('plan', { type: 'radio', value: 'basic' })
        const proProps = result.current.register('plan', { type: 'radio', value: 'pro' })

        act(() => {
          basicProps.ref(basic)
          proProps.ref(pro)
          result.current.setValue('plan', 'pro')
          basicProps.ref(null)
        })
        await flushMicrotasks()
        expect(result.current.values.plan).toBe('pro')

        act(() => {
          proProps.ref(null)
        })
        await flushMicrotasks()
        expect(result.current.values.plan).toBeUndefined()
      })
    })

    describe('validation and submission', () => {
      it('skips removed-field rules and omits the path from submit', async () => {
        const onSubmit = vi.fn()
        const { result } = renderHook(() =>
          useForm<ConditionalValues>({
            defaultValues: conditionalDefaults,
            shouldUnregister: true,
            rules: {
              'company.taxNumber': rules.required('Tax required'),
              email: rules.required('Email required'),
            },
            onSubmit,
          }),
        )

        act(() => {
          result.current.unregister('company', { keepValue: false })
        })

        await act(async () => {
          await result.current.validate()
        })
        expect(result.current.errors['company.taxNumber']).toBeUndefined()

        await act(async () => {
          await result.current.handleSubmit()
        })
        expect(onSubmit).toHaveBeenCalledTimes(1)
        expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
          accountType: 'personal',
          email: 'a@b.com',
        })
        expect(onSubmit.mock.calls[0]?.[0]).not.toHaveProperty('company')
      })

      it('still validates a preserved hidden field', async () => {
        const { result } = renderHook(() =>
          useForm<ConditionalValues>({
            defaultValues: { ...conditionalDefaults, email: '' },
            rules: { email: rules.required('Email required') },
          }),
        )

        act(() => {
          result.current.unregister('email')
        })

        await act(async () => {
          await result.current.validate()
        })
        expect(result.current.values.email).toBe('')
        expect(result.current.errors.email).toBe('Email required')
      })

      it('cancels pending debounce and ignores stale results after unregister', async () => {
        vi.useFakeTimers()
        let finish!: (message: string | undefined) => void
        const { result } = renderHook(() =>
          useForm<ConditionalValues>({
            defaultValues: conditionalDefaults,
            mode: ValidationMode.OnChange,
            rules: {
              'company.taxNumber': [
                rules.async(
                  async () => {
                    return await new Promise<string | undefined>((resolve) => {
                      finish = resolve
                    })
                  },
                  { debounce: 50 },
                ),
              ],
            },
          }),
        )

        act(() => {
          result.current.setValue('company.taxNumber', 'pending')
        })
        act(() => {
          vi.advanceTimersByTime(50)
        })
        act(() => {
          result.current.unregister('company.taxNumber')
        })
        await act(async () => {
          finish?.('stale')
        })

        expect(result.current.errors['company.taxNumber']).toBeUndefined()
        expect(result.current.isValidating).toBe(false)
        vi.useRealTimers()
      })

      it('does not focus a disconnected field after submit', async () => {
        const focus = vi.fn()
        const { result } = renderHook(() =>
          useForm<ConditionalValues>({
            defaultValues: { ...conditionalDefaults, email: '' },
            focusOnError: true,
            rules: { email: rules.required('Email required') },
          }),
        )
        const input = document.createElement('input')
        input.focus = focus
        const props = result.current.register('email')
        act(() => {
          props.ref(input)
          props.ref(null)
          result.current.unregister('email')
        })

        await act(async () => {
          await result.current.handleSubmit()
        })
        expect(focus).not.toHaveBeenCalled()
      })
    })

    describe('async defaults and reset', () => {
      it('does not resurrect a removed optional value when defaults load', async () => {
        let resolveLoad!: (value: ConditionalValues) => void
        const pending = new Promise<ConditionalValues>((resolve) => {
          resolveLoad = resolve
        })
        const { result } = renderHook(() =>
          useForm<ConditionalValues>({
            defaultValues: conditionalDefaults,
            loadDefaultValues: async () => pending,
          }),
        )

        act(() => {
          result.current.unregister('company', { keepValue: false })
        })

        await act(async () => {
          resolveLoad({
            ...conditionalDefaults,
            company: { name: 'Server Co', taxNumber: 'SERVER' },
            email: 'server@example.com',
          })
          await pending
        })

        expect(result.current.values.company).toBeUndefined()
        expect(result.current.defaultValues.company).toEqual({
          name: 'Server Co',
          taxNumber: 'SERVER',
        })
        expect(result.current.values.email).toBe('server@example.com')
        expect(result.current.isDefaultsReady).toBe(true)
      })

      it('reset restores active fields but keeps inactive optional values absent', () => {
        const { result } = renderHook(() =>
          useForm<ConditionalValues>({ defaultValues: conditionalDefaults }),
        )

        act(() => {
          result.current.setValue('email', 'edited@example.com')
          result.current.unregister('company', { keepValue: false })
          result.current.reset()
        })

        expect(result.current.values.email).toBe('a@b.com')
        expect(result.current.values.company).toBeUndefined()
      })

      it('resetField is a no-op for inactive paths', () => {
        const { result } = renderHook(() =>
          useForm<ConditionalValues>({ defaultValues: conditionalDefaults }),
        )

        act(() => {
          result.current.unregister('company', { keepValue: false })
          result.current.resetField('company')
        })

        expect(result.current.values.company).toBeUndefined()
      })
    })

    describe('native conditional rendering', () => {
      it('unregisters a conditionally disconnected native field', async () => {
        const { result } = renderHook(() =>
          useForm<ConditionalValues>({
            defaultValues: conditionalDefaults,
            shouldUnregister: true,
          }),
        )
        const input = document.createElement('input')
        const props = result.current.register('company.taxNumber')
        act(() => {
          props.ref(input)
        })
        expect(result.current.values.company?.taxNumber).toBe('TAX-1')

        act(() => {
          props.ref(null)
        })
        await flushMicrotasks()
        expect(result.current.values.company?.taxNumber).toBeUndefined()
      })
    })
  })

  describe('structured errors', () => {
    it('keeps string errors aligned with canonical details', async () => {
      const { result } = renderHook(() =>
        useForm<LoginForm>({
          defaultValues: loginDefaults,
          rules: {
            email: [
              rules.required('Email is required'),
              rules.email('Enter a valid email address'),
            ],
          },
        }),
      )

      await act(async () => {
        await result.current.validateField('email')
      })

      expect(result.current.errors.email).toBe('Email is required')
      expect(result.current.errorDetails.email?.message).toBe('Email is required')
      expect(result.current.errorDetails.email?.source).toBe('rule')
      expect(result.current.errorDetails.email?.type).toBe('required')
      expect(result.current.errorDetails.email?.issues).toHaveLength(1)
    })

    it('collects every field-rule failure in all mode without reordering async work', async () => {
      const { result } = renderHook(() =>
        useForm<{ password: string }>({
          defaultValues: { password: 'short' },
          criteriaMode: 'all',
          rules: {
            password: [
              rules.required('Password is required'),
              rules.minLength(12, 'Use at least 12 characters'),
              rules.pattern(/[A-Z]/, 'Add an uppercase letter'),
              async () => 'Needs a number',
            ],
          },
        }),
      )

      await act(async () => {
        await result.current.validateField('password')
      })

      expect(result.current.errors.password).toBe('Use at least 12 characters')
      expect(result.current.errorDetails.password?.issues.map((issue) => issue.message)).toEqual([
        'Use at least 12 characters',
        'Add an uppercase letter',
        'Needs a number',
      ])
    })

    it('stops at the first field-rule failure by default', async () => {
      const later = vi.fn(() => 'later')
      const { result } = renderHook(() =>
        useForm<LoginForm>({
          defaultValues: loginDefaults,
          rules: {
            email: [rules.required('Email is required'), later],
          },
        }),
      )

      await act(async () => {
        await result.current.validateField('email')
      })

      expect(result.current.errors.email).toBe('Email is required')
      expect(result.current.errorDetails.email?.issues).toHaveLength(1)
      expect(later).not.toHaveBeenCalled()
    })

    it('records manual and server sources without breaking existing setError signatures', () => {
      const { result } = renderHook(() => useForm<LoginForm>({ defaultValues: loginDefaults }))

      act(() => {
        result.current.setError('email', 'Invalid email')
      })
      expect(result.current.errors.email).toBe('Invalid email')
      expect(result.current.errorDetails.email?.source).toBe('manual')

      act(() => {
        result.current.setError('email', 'Email already exists', {
          source: 'server',
          type: 'unique',
        })
      })
      expect(result.current.errorDetails.email?.source).toBe('server')
      expect(result.current.errorDetails.email?.type).toBe('unique')

      act(() => {
        result.current.setErrors({ password: 'Too weak' })
      })
      expect(result.current.errors.password).toBe('Too weak')
      expect(result.current.errorDetails.password?.source).toBe('manual')
    })

    it('clears server issues on edit while keeping unrelated manual errors', () => {
      const { result } = renderHook(() =>
        useForm<LoginForm>({
          defaultValues: loginDefaults,
          mode: ValidationMode.OnSubmit,
        }),
      )

      act(() => {
        result.current.setError('email', 'Email already exists', { source: 'server' })
        result.current.setError('password', 'Check this', { source: 'manual' })
        result.current.setValue('email', 'next@example.com')
      })

      expect(result.current.errors.email).toBeUndefined()
      expect(result.current.errorDetails.email).toBeUndefined()
      expect(result.current.errors.password).toBe('Check this')
      expect(result.current.errorDetails.password?.source).toBe('manual')
    })

    it('preserves manual errors while waiting for a debounced rule', async () => {
      vi.useFakeTimers()
      const { result } = renderHook(() =>
        useForm<{ username: string }>({
          defaultValues: { username: 'alice' },
          mode: ValidationMode.OnChange,
          rules: {
            username: rules.async(async () => 'Taken', { debounce: 400 }),
          },
        }),
      )

      act(() => {
        result.current.setError('username', 'Fix formatting')
        result.current.setValue('username', 'bob')
      })
      expect(result.current.errors.username).toBe('Fix formatting')
      expect(result.current.errorDetails.username?.source).toBe('manual')

      await act(async () => {
        await vi.advanceTimersByTimeAsync(400)
      })
      expect(result.current.errors.username).toBe('Taken')
      expect(result.current.errorDetails.username?.source).toBe('rule')
      vi.useRealTimers()
    })

    it('keeps rootError and rootErrorDetails in sync', async () => {
      const { result } = renderHook(() =>
        useForm<LoginForm>({
          defaultValues: loginDefaults,
          resolver: () => ({
            success: false,
            errors: {},
            rootError: 'Form combination is invalid',
          }),
        }),
      )

      await act(async () => {
        await result.current.validate()
      })

      expect(result.current.rootError).toBe('Form combination is invalid')
      expect(result.current.rootErrorDetails?.message).toBe('Form combination is invalid')
      expect(result.current.rootErrorDetails?.source).toBe('resolver')
      expect(result.current.isValid).toBe(false)

      act(() => {
        result.current.clearRootError()
      })
      expect(result.current.rootError).toBeUndefined()
      expect(result.current.rootErrorDetails).toBeUndefined()
    })

    it('clears both error views on unregister and reset', () => {
      const { result } = renderHook(() => useForm<LoginForm>({ defaultValues: loginDefaults }))

      act(() => {
        result.current.setError('email', 'Required')
        result.current.unregister('email')
      })
      expect(result.current.errors.email).toBeUndefined()
      expect(result.current.errorDetails.email).toBeUndefined()

      act(() => {
        result.current.setError('password', 'Required')
        result.current.reset()
      })
      expect(result.current.errors.password).toBeUndefined()
      expect(result.current.errorDetails.password).toBeUndefined()
    })
  })

  describe('validation messages', () => {
    it('keeps default English messages without a catalog', async () => {
      const { result } = renderHook(() =>
        useForm<LoginForm>({
          defaultValues: loginDefaults,
          rules: {
            email: [rules.required(), rules.email()],
            password: rules.minLength(8),
          },
        }),
      )

      await act(async () => {
        await result.current.validate()
      })

      expect(result.current.errors.email).toBe('This field is required')
      act(() => {
        result.current.setValue('email', 'bad', { shouldValidate: false })
      })
      await act(async () => {
        await result.current.validateField('email')
      })
      expect(result.current.errors.email).toBe('Enter a valid email address')

      act(() => {
        result.current.setValue('password', 'short', { shouldValidate: false })
      })
      await act(async () => {
        await result.current.validateField('password')
      })
      expect(result.current.errors.password).toBe('Must be at least 8 characters')
    })

    it('uses the latest catalog and labels only after revalidation', async () => {
      const { result, rerender } = renderHook(
        ({
          messages,
          labels,
        }: {
          messages?: ValidationMessageCatalog<LoginForm>
          labels?: FieldLabels<LoginForm>
        }) =>
          useForm<LoginForm>({
            defaultValues: loginDefaults,
            rules: { email: rules.required() },
            validationMessages: messages,
            fieldLabels: labels,
          }),
        { initialProps: {} },
      )

      await act(async () => {
        await result.current.validateField('email')
      })
      expect(result.current.errors.email).toBe('This field is required')
      const control = result.current.control
      const values = result.current.values

      rerender({
        messages: {
          required: ({ label }: { label: string }) => `${label} դաշտը պարտադիր է`,
        },
        labels: { email: 'Էլ․ հասցե' },
      })

      expect(result.current.errors.email).toBe('This field is required')
      expect(result.current.control).toBe(control)
      expect(result.current.values).toEqual(values)
      expect(result.current.isDirty).toBe(false)
      expect(result.current.touched.email).toBeUndefined()

      await act(async () => {
        await result.current.validateField('email')
      })
      expect(result.current.errors.email).toBe('Էլ․ հասցե դաշտը պարտադիր է')
    })

    it('lets per-rule messages win over the form catalog', async () => {
      const { result } = renderHook(() =>
        useForm<LoginForm>({
          defaultValues: loginDefaults,
          validationMessages: {
            required: 'From catalog',
          },
          rules: {
            email: rules.required('Email is required'),
            password: rules.required(),
          },
        }),
      )

      await act(async () => {
        await result.current.validate()
      })
      expect(result.current.errors.email).toBe('Email is required')
      expect(result.current.errors.password).toBe('From catalog')
    })

    it('preserves custom, form, resolver, and manual messages', async () => {
      const { result } = renderHook(() =>
        useForm<LoginForm>({
          defaultValues: { ...loginDefaults, email: 'admin' },
          validationMessages: { required: 'Catalog required' },
          rules: {
            email: (value) => (value === 'admin' ? 'Reserved username' : undefined),
          },
          validate: (values) => ({
            password: values.password ? undefined : 'Passwords must match',
          }),
          resolver: async () => ({
            success: false,
            errors: { email: 'From schema' },
            rootError: 'Validation failed',
          }),
        }),
      )

      await act(async () => {
        await result.current.validateField('email')
      })
      expect(result.current.errors.email).toBe('Reserved username')

      await act(async () => {
        await result.current.validate()
      })
      expect(result.current.errors.password).toBe('Passwords must match')
      expect(result.current.errors.email).toBe('Reserved username')

      act(() => {
        result.current.setError('email', 'Already exists', { source: 'server', type: 'unique' })
      })
      expect(result.current.errors.email).toBe('Already exists')
      expect(result.current.errorDetails.email?.source).toBe('server')
    })

    it('does not restart async default loading when the catalog changes', async () => {
      const loader = vi.fn(async () => ({
        email: 'loaded@example.com',
        password: '',
        rememberMe: false,
      }))
      const { result, rerender } = renderHook(
        ({ messages }: { messages?: ValidationMessageCatalog<LoginForm> }) =>
          useForm<LoginForm>({
            defaultValues: loginDefaults,
            loadDefaultValues: loader,
            validationMessages: messages,
          }),
        { initialProps: {} },
      )

      await waitFor(() => {
        expect(result.current.isDefaultsReady).toBe(true)
      })
      expect(loader).toHaveBeenCalledTimes(1)

      rerender({ messages: { required: 'Required' } })
      expect(loader).toHaveBeenCalledTimes(1)
      expect(result.current.values.email).toBe('loaded@example.com')
      expect(result.current.isDefaultsReady).toBe(true)
    })

    it('does not put file contents or passwords into message factories', async () => {
      const seen: unknown[] = []
      const file = new File(['secret-bytes'], 'secret.png', { type: 'image/png' })
      const { result } = renderHook(() =>
        useForm<{ password: string; avatar: File | null }>({
          defaultValues: { password: 'hunter2', avatar: file },
          rules: {
            password: rules.minLength(20),
            avatar: rules.fileSize(1),
          },
          validationMessages: {
            minLength: (context) => {
              seen.push(context)
              return 'short'
            },
            fileSize: (context) => {
              seen.push(context)
              return 'big'
            },
          },
        }),
      )

      await act(async () => {
        await result.current.validate()
      })

      expect(JSON.stringify(seen)).not.toContain('hunter2')
      expect(JSON.stringify(seen)).not.toContain('secret-bytes')
      expect(JSON.stringify(seen)).not.toContain('secret.png')
      for (const context of seen) {
        expect(context).toEqual(
          expect.objectContaining({
            type: expect.any(String),
            name: expect.any(String),
            label: expect.any(String),
            params: expect.any(Object),
          }),
        )
        expect(Object.keys(context as object).sort()).toEqual(['label', 'name', 'params', 'type'])
      }
    })
  })
})
