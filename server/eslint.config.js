import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
export default tseslint.config(
  { ignores: ['dist', 'tests', '*.config.ts', 'src/**/*.test.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['src/**/*.ts'], languageOptions: { globals: globals.node }, rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
  } },
);
