module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'standard',
    'plugin:vue/vue3-recommended'
  ],
  overrides: [
    {
      env: {
        node: true
      },
      files: [
        '.eslintrc.{js,cjs}'
      ],
      parserOptions: {
        sourceType: 'script'
      }
    }
  ],
  parserOptions: {
    ecmaVersion: 13,
    sourceType: 'module',
    ecmaFeatures: {
      modules: true,
      jsx: true
    },
    requireConfigFile: false,
    parser: '@babel/eslint-parser'
  },
  plugins: [
    'vue'
  ],
  rules: {
    semi: ['error', 'never'],
    quotes: ['error', 'single'],
    indent: ['error', 2],
    camelcase: 'off',
    'comma-dangle': ['error', 'never'],
    'linebreak-style': ['error', 'unix'],
    'no-tabs': 'off',
    'eol-last': ['error', 'always'],
    'vue/multi-word-component-names': 'off',
    'vue/component-name-in-template-casing': ['error', 'PascalCase'],
    // 'vue/name-property-casing': ['error', 'PascalCase'],
    'vue/html-self-closing': 'error',
    'no-unused-vars': 'warn'
  }
}
