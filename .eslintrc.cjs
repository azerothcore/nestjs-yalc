module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  parserOptions: {
    project: 'tsconfig.dev.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: [
    '**/node_modules',
    '**/*spec.ts',
    '**/__tests__',
    '**/__mocks__',
    '**/jest.config.ts',
  ],
  overrides: [
    {
      files: ['**/*.ts'],
      excludedFiles: ['**/test/**'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended',
      ],
      rules: {
        '@typescript-eslint/interface-name-prefix': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-floating-promises': ['warn'],
        'no-console': 'error',
        '@typescript-eslint/no-unused-vars': 'off',
        eqeqeq: 1,
      },
    },
  ],
};
