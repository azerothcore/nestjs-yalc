import {
  IAppProjSetting,
  IOptions,
  IProjectInfo,
  jestConfGenerator,
  nestjsCliJsonToProjectList,
} from '@nestjs-yalc/jest-config';
import nestCliJson from './nest-cli.json';

console.log('=================== LOADING JEST OPTIONS ================');

const appProjectsSettings: { [key: string]: IAppProjSetting } = {};

const options: IOptions = {
  defaultConfOptions: {
    transformEsModules: false,
    jestConf: {
      // injectGlobals: false, -> we can't set it to false because of this issue: https://github.com/golevelup/nestjs/issues/557
    },
  },
  defaultCoverageThreshold: {
    branches: 100,
    functions: 100,
    lines: 100,
    statements: 100,
  },
};

const conf = jestConfGenerator(
  __dirname,
  nestjsCliJsonToProjectList(nestCliJson),
  appProjectsSettings,
  options,
);

export default conf;
