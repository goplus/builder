module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:vue/vue3-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier-vue/recommended",
  ],
  parser: "vue-eslint-parser",
  parserOptions: {
    parser: "@typescript-eslint/parser",
    sourceType: "module",
  },
  rules: {
    "no-unused-vars": "off",
    // "vue/no-unused-vars": "warn",
    "@typescript-eslint/no-unused-vars": "warn",
    "prettier-vue/prettier": "off",
    "no-useless-escape": "warn",
  },
};
