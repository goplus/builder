/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier/skip-formatting'
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  },
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
          'v-.*', // for Vue Konva components
          'I18nT',
          'TagRoot',
          'TagNode' // for TagNode while register as a global component in main.ts
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
        ignoreRestSiblings: true
      }
    ]
  }
}
