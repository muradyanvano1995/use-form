import { addons } from 'storybook/manager-api'
import { docsLightTheme } from '../src/stories/theme/managerThemes.ts'

addons.setConfig({
  theme: docsLightTheme,
})
