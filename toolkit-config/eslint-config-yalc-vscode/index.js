module.exports = {
  extends: ['eslint-config-yalc'],
  root: true,
  parserOptions: {
    // by disabling the type-checking feature we exponentially increase the speed of the linting process
    // while editing the code in the VSCode
    // NOTE: this doesn't affect the lint command that is executed in the CI/CD pipeline
    project: false,
    EXPERIMENTAL_useProjectService: false,
  },
  rules: {
    /**
     * The following rules do not work when the parserOptions.project is set to false.
     * Because of missing type-checking feature
     */
    '@typescript-eslint/no-floating-promises': 'off',
    '@typescript-eslint/naming-convention': 'off',
  },
};
