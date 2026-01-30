/**
 * ESLint Configuration for Delqhi Platform Dashboard
 * Next.js 14 compatible strict mode
 */
module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'react/no-unescaped-entities': 'warn',
    '@next/next/no-img-element': 'warn',
  },
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
};
