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
          'v-.*' // for Vue Konva components
        ]
      }
    ]
  }
}
