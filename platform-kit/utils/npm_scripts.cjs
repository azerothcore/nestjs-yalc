/**
 * Use this file to implement more complex scripts for your npm commands
 * For application-related commands/scripts please use the CLI app instead
 */

const { Command } = require('commander');
const {
  nestJsCustomCommand,
} = require('../../scripts/src/npm_scripts_lib.cjs');
const { projects } = require('../nest-cli.json');

const program = new Command();

program
  .name('npm_scripts')
  .description('Nodejs scripts to extends npm run functionalities')
  .version('1.0.0')
  .helpOption('-info, --info', 'Display help for command');

/**
 * Jest
 */

nestJsCustomCommand(
  program,
  (rootPath) =>
    `NODE_OPTIONS="--experimental-vm-modules --experimental-import-meta-resolve" npx jest --logHeapUsage  --config "${rootPath}/test/jest-e2e.ts" --detectOpenHandles --coverage false`,
  'test:e2e',
  projects,
  {
    noCd: true,
  },
);

/**
 * TYPEORM
 */

nestJsCustomCommand(
  program,
  'npx typeorm migration:create ./src/database/migrations/',
  'typeorm:gen:migration',
  projects,
  { noSpace: true },
);

/**
 * CLI
 */

const cliCommand = (args, npmCommand) =>
  nestJsCustomCommand(
    program,
    // `cross-env TS_NODE_PROJECT=tsconfig.app.json node --loader ${__dirname}/ts-loader.mjs src/cli`,
    (rootPath) =>
      `npx cross-env TS_NODE_PROJECT="${rootPath}/tsconfig.app.json" node --loader ts-node/esm "${rootPath}/src/cli.ts" ${args}`,
    npmCommand,
    projects,
    {
      isCli: true,
      noCd: true,
    },
  );

cliCommand('', 'cli');
// shortcuts
cliCommand('migrate', 'cli:db:migrate');
cliCommand('drop', 'cli:db:drop');
cliCommand('seed', 'cli:db:seed');

program.parse();
