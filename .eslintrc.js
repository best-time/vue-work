module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2021: true
  },
  extends: [
    'plugin:vue/essential',
    'eslint:recommended'
  ],
  parserOptions: {
    parser: '@babel/eslint-parser',
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  rules: {
    'vue/multi-word-component-names': 'off',

    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-var': 'warn',
    'prefer-const': 'warn',

    'vue/no-mutating-props': 'error',
    'vue/require-v-for-key': 'error',
    'vue/valid-template-root': 'error',
    'vue/no-use-v-if-with-v-for': 'warn',
    'vue/no-parsing-error': 'error'
  }
}