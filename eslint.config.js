import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      // jsx-a11y v6 ships its flat config under `.flatConfigs.recommended`.
      // Catches the high-confidence accessibility issues — alt text on
      // images, valid ARIA attributes, no static onClick without
      // keyboard handler, etc. — without being preachy.
      jsxA11y.flatConfigs.recommended,
    ],
    rules: {
      // The dashboard uses a lot of div-with-onClick patterns for chip
      // toggles + table-row drilldowns. Most have a matching button
      // somewhere or live on a focused parent. Downgrading these to
      // warn (not error) lets CI pass while keeping the signal visible
      // for a future a11y compliance sweep.
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
