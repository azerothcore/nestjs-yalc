import {
  IAppProjSetting,
  IOptions,
  IProjectInfo,
  jestConfGenerator,
} from './jest/src/config';

console.log('=================== LOADING JEST OPTIONS ================');

import tsProjects from './tsconfig.json';

const appProjectsSettings: { [key: string]: IAppProjSetting } = {};

const projectList: { [key: string]: IProjectInfo } = {};

const paths: Record<string, string[]> = tsProjects.compilerOptions.paths;
Object.keys(paths).map((k: string) => {
  const path: string = paths[k][0];

  if (!k.endsWith('*')) {
    projectList[k] = {
      path: path.replace('/src', '').replace('./', ''),
      sourcePath: path.replace('./', ''),
      type: 'library',
    };
  }
});

const options: IOptions = {
  defaultConfOptions: {
    transformEsModules: false,
    jestConf: {
      // injectGlobals: false, -> we can't set it to false because of this issue: https://github.com/golevelup/nestjs/issues/557
    },
  },
  // TODO: re-enable everything except types
  skipProjects: ['types', 'graphql', 'crud-gen', 'kafka', 'jest'],
  defaultCoverageThreshold: {
    branches: 100,
    functions: 100,
    lines: 100,
    statements: 100,
  },
  confOverrides: {
    '@nestjs-yalc/app': {
      coverageThreshold: {
        statements: 60.76,
        branches: 52.08,
        functions: 52.94,
        lines: 60.55,
      },
    },
    '@nestjs-yalc/logger': {
      coverageThreshold: {
        statements: 98.02,
        branches: 94.4,
        functions: 83.87,
        lines: 88.7,
      },
    },
    '@nestjs-yalc/utils': {
      coverageThreshold: {
        statements: 93.44,
        branches: 92.85,
        functions: 87.17,
        lines: 93.83,
      },
    },
  },
};

const conf = jestConfGenerator(
  __dirname,
  projectList,
  appProjectsSettings,
  options,
);

conf.injectGlobals = false;

export default conf;
