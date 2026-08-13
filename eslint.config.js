import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['scripts/**/*.mjs', 'eslint.config.js'],
    languageOptions: {
      globals: { console: 'readonly', process: 'readonly', Buffer: 'readonly' }
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { tsconfigRootDir: import.meta.dirname },
      globals: { document: 'readonly', window: 'readonly', localStorage: 'readonly', navigator: 'readonly', URL: 'readonly', File: 'readonly', Blob: 'readonly', crypto: 'readonly', FormData: 'readonly', console: 'readonly', process: 'readonly' }
    },
    rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] }
  }
);
