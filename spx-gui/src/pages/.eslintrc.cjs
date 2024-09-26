/* eslint-env node */
module.exports = {
  extends: [
    '../../.eslintrc.cjs'
  ],
  rules: {
    // Page components will not be used by name in other components' template.
    // Disable this rule to simplify naming of page components.
    'vue/multi-word-component-names': 'off'
  }
}
