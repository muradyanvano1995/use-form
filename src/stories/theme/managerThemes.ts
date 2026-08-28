import { create } from 'storybook/theming/create'

const fontBase = 'Segoe UI, Helvetica Neue, system-ui, sans-serif'
const fontCode = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

export const docsLightTheme = create({
  base: 'light',
  brandTitle: 'Form hooks',
  brandUrl: undefined,
  brandImage: undefined,
  brandTarget: '_self',
  colorPrimary: '#0f766e',
  colorSecondary: '#0f766e',
  appBg: '#efe8dc',
  appContentBg: '#fffdf8',
  appPreviewBg: '#f4f1ea',
  appBorderColor: '#c9c0b0',
  appBorderRadius: 8,
  fontBase,
  fontCode,
  textColor: '#14213d',
  textMutedColor: '#4a5a70',
  textInverseColor: '#fffdf8',
  barTextColor: '#2c3a52',
  barSelectedColor: '#0f766e',
  barHoverColor: '#0d9488',
  barBg: '#fffdf8',
  inputBg: '#ffffff',
  inputBorder: '#c9c0b0',
  inputTextColor: '#14213d',
  inputBorderRadius: 6,
})
