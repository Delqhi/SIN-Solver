/**
 * ESLint Configuration for Delqhi Platform Dashboard
 * Next.js 14 compatible strict mode - FIXED for ESLint 8.x+
 */
module.exports = {
  extends: ['next/core-web-vitals'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'react/no-unescaped-entities': 'warn',
    '@next/next/no-img-element': 'warn',
  },
};
