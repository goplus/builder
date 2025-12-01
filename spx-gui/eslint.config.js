import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}']
  },

  {
    name: 'app/files-to-ignore',
    ignores: [
      'dist/**',
      '.vercel/**',
      'node_modules/**',
      'public/**',
      '**/wasm_exec.js',
      'src/utils/snippet-parser/**',
      'src/assets/wasm/**',
      'src/components/editor/code-editor/ui/completion/fuzzy/**'
    ]
  },

  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  skipFormatting,

  {
    name: 'app/rules',
    rules: {
      'no-useless-escape': 'warn',
      'vue/no-mutating-props': [
        'error',
        {
          shallowOnly: true
        }
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-redeclare': 'off',
      'vue/no-undef-components': [
        'error',
        {
          ignorePatterns: [
            // These rules will match components in both kebab-case and CamelCase
            'router-view',
            'router-link',
            'RouterView',
            'RouterLink',
            'v-.*', // for Vue Konva components
            'I18nT'
          ]
        }
      ],
      'no-restricted-imports': [
        'warn',
        {
          paths: [
            {
              // Workaround for https://github.com/vuejs/eslint-plugin-vue/issues/2437
              name: 'vue',
              importNames: ['defineProps', 'defineEmits'],
              message: '`defineProps` and `defineEmits` are compiler macros and no longer need to be imported.'
            }
          ]
        }
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          ignoreRestSiblings: true,
          destructuredArrayIgnorePattern: '^_'
        }
      ],
      'vue/one-component-per-file': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'prefer-const': [
        'warn',
        {
          destructuring: 'all'
        }
      ]
    }
  },

  {
    name: 'app/pages-rules',
    files: ['src/pages/**/*.vue'],
    rules: {
      // Page components will not be used by name in other components' template.
      // Disable this rule to simplify naming of page components.
      'vue/multi-word-component-names': 'off'
    }
  }
)
