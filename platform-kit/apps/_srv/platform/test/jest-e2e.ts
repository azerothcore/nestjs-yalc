/* istanbul ignore file */
import { createE2EConfig } from '@nestjs-yalc/jest/config/index.js';
import path from 'path';

const conf = createE2EConfig({
  e2eDirname: __dirname,
  rootDirname: __dirname + '/../../../../',
  confOverride: {
    testTimeout: 40000,
    globalSetup: path.join(__dirname, 'jest-global.e2e-setup.ts'),
  },
  withGqlPlugins: true,
});

export default conf;
