import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import eslintPluginPreferArrow from 'eslint-plugin-prefer-arrow';
import reactCompiler from 'eslint-plugin-react-compiler';
import unicorn from 'eslint-plugin-unicorn';

export default tseslint.config(
  {
    ignores: ['**/dist', '**/node_modules', '**/tailwind.config.ts', '**/public', '**/packages/wasm'],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'simple-import-sort': simpleImportSort,
      'prefer-arrow': eslintPluginPreferArrow,
      'react-compiler': reactCompiler,
      unicorn,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'off',

      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react-compiler/react-compiler': 'error',

      // region simple-import-sort
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^react$', 'react-dom'],
            ['normalize.css', '(.*).css'],
            [String.raw`^@?\w`],
            ['@/components/pages/(.*)'],
            ['@/components/ui/(.*)'],
            ['@/components/(.*)'],
            ['@/(.*)'],
            ['^[./]'],
          ],
        },
      ],
      // endregion

      // region prefer-arrow
      'prefer-arrow/prefer-arrow-functions': [
        'warn',
        {
          disallowPrototype: true,
          singleReturnOnly: false,
          classPropertiesAllowed: false,
        },
      ],
      // endregion

      // region 原生替代 unused-imports
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      // 自动修复未使用 import（和原来 unused-imports 效果一致）
      'no-unused-imports': 'off',
      // endregion

      // region typescript-eslint
      '@typescript-eslint/no-shadow': 0,
      '@typescript-eslint/no-use-before-define': 0,
      '@typescript-eslint/ban-ts-ignore': 0,
      '@typescript-eslint/no-empty-function': 0,
      '@typescript-eslint/ban-ts-comment': 0,
      '@typescript-eslint/no-var-requires': 0,
      '@typescript-eslint/no-explicit-any': 0,
      '@typescript-eslint/no-this-alias': 0,
      '@typescript-eslint/explicit-module-boundary-types': 0,
      '@typescript-eslint/ban-types': 0,
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-empty-interface': 'error',
      // endregion

      // region eslint
      'arrow-body-style': ['error', 'as-needed'],
      'prefer-arrow-callback': 'error',
      // endregion

      // unicorn
      'unicorn/no-null': 'off',
      'unicorn/prefer-ternary': 'off',
      'unicorn/prefer-top-level-await': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/no-useless-undefined': 'off',
    },
  },
  eslintPluginPrettierRecommended,
);
