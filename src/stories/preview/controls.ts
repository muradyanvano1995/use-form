import { CriteriaMode, ReValidateMode, ValidationMode } from '../../lib'

export const modeArgType = {
  control: 'select' as const,
  options: Object.values(ValidationMode),
  description: 'When to validate after the first interaction (`UseFormOptions.mode`).',
}

export const reValidateModeArgType = {
  control: 'select' as const,
  options: Object.values(ReValidateMode),
  description: 'When to revalidate after the form has been submitted once.',
}

export const criteriaModeArgType = {
  control: 'select' as const,
  options: Object.values(CriteriaMode),
  description: 'Whether to keep the first issue or collect every issue per field.',
}

export const disabledArgType = {
  control: 'boolean' as const,
  description: 'Disables native fields and submit/reset actions for this example.',
}

export const staticPageParameters = {
  controls: { disable: true },
  actions: { disable: true },
  docs: {
    description: {
      story:
        'Controls and Actions are disabled because this is static documentation, not a configurable widget.',
    },
  },
}
