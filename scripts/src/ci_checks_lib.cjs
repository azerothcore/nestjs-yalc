const concurrently = require('concurrently');
const os = require('os');
const { program } = require('commander');

// Memory and CPU information
const totalMemory = os.totalmem();
const totalMemoryInMB = (totalMemory / 1024 / 1024).toFixed(0);
console.debug('Total Memory:', totalMemoryInMB, 'MB');
const numCores = Math.ceil(os.cpus().length / 2);

function programOptionFactory(CommandEnum) {
  // Commander setup for CLI options
  return program
    .option('-a, --apps [apps]', 'list of app names', (value) =>
      value.split(','),
    )
    .option(
      '-m, --max-processes <number>',
      'maximum number of processes',
      (value) => parseInt(value, 10),
      numCores,
    )
    .option(
      '-d, --deploy, this will also enable the --no-kill-others option',
      'deploy apps',
      false,
    )
    .option(
      '-dc, --deploy-concurrently <number>',
      'deploy apps concurrently',
      (value) => parseInt(value, 10),
      1,
    )
    .option('-dl, --deploy-local', 'deploy apps to localstack', false)
    .option(
      '-od, --only-deploy',
      `Run deployment-only commands, this will also enable the --no-kill-others option.
     Note: you still need to specify the --deploy or --deploy-local`,
      false,
    )
    .option(
      '-s, --skip <commands>',
      `Skip the specified commands. List (comma-separated): \n${Object.values(
        CommandEnum,
      ).join(',\n')}`,
    )
    .option(
      '-o, --only <commands>',
      `Run only the specified commands (comma-separated). List: \n${Object.values(
        CommandEnum,
      ).join(',\n')}`,
    )
    .option('-oj, --only-jest', 'Run jest-only commands', false)
    .option('-sj, --skip-jest-checks', 'skip jest tests', false)
    .option('-sl, --skip-libs', 'run checks for libs', false)
    .option('-nf, --no-fix', 'skip fix lint errors', false)
    .option(
      '-nk, --no-kill-others',
      'avoid killing other processes on failure',
    );
}

/**
 * @typedef {Object} Options
 * @property {boolean} deploy
 * @property {boolean} deployLocal
 * @property {string[]} only
 * @property {boolean} onlyDeploy
 * @property {boolean} onlyJest
 * @property {string[]} skip
 * @property {boolean} skipJestChecks
 * @property {boolean} skipLibs
 * @property {boolean} killOthers
 * @property {boolean} noFix
 * @property {boolean} maxProcesses
 * @property {boolean} killExtraCondition - to apply on killOthers
 * @property {string[]} apps
 */

const CommandEnum = {
  Build: 'build',
  AuditCi: 'auditci',
  BuildWatch: 'build:watch',
  LintLibs: 'lint:libs',
  LintApps: 'lint:apps',
  TestLibsCov: 'test:libs:cov',
  TestAppsCov: 'test:apps:cov',
  TestAppsE2E: 'test:apps:e2e',
  Migrate: 'migrate',
  DryRun: 'dry-run',
};

/**
 *
 * @param {*} commands
 * @param {Options} options
 * @returns
 */
function runConcurrentCommands(commands, options) {
  console.log('options:', options);
  return concurrently(commands, {
    maxProcesses: options.maxProcesses,
    killOthers:
      options.killOthers &&
      !!options.killExtraCondition &&
      !options.deploy &&
      !options.onlyDeploy &&
      !options.deployLocal
        ? ['failure']
        : undefined,
  });
}

function printOutputs(errorOutputs, commandOutputs) {
  const commandsWithErrors = [];

  Object.values(commandOutputs).forEach((output) => {
    console.log('--------------------------------------');
    console.log({
      name: output.name,
      command: output.command,
      // commandIndex: output.commandIndex,
      time: output.time,
    });
  });

  Object.values(errorOutputs).forEach((output) => {
    if (!output.exitCode) {
      return;
    }

    commandsWithErrors.push(output.name);

    console.error('--------------------------------------');
    console.error({
      command: output.command,
      name: output.name,
      exitCode: output.exitCode,
      commandIndex: output.commandIndex,
    });
    console.error(output.message);
  });

  if (commandsWithErrors.length) {
    console.error('--------------------------------------');
    console.error('Commands with errors:', commandsWithErrors);
    console.error(
      'You can run this command to test the failing commands:\n',
      `npm run ci:checks -- --no-kill-others --only=${commandsWithErrors.join(
        ',',
      )}`,
    );
  }

  return commandsWithErrors;
}

function updateErrorOutputs(errorOutputs, index, command, exitCode, message) {
  const previousMessage = errorOutputs[index]?.message || '';
  errorOutputs[index] = {
    command: command.command,
    name: command.name,
    exitCode: exitCode,
    commandIndex: index,
    message: previousMessage + (message?.toString() || ''),
  };
}

function updateCommandOutputs(commandOutputs, index, close) {
  commandOutputs[index] = {
    command: close.command.command,
    name: close.command.name,
    commandIndex: index,
    time: close.timings,
  };
}

const subscriber = (command, message, errorOutputs, indexOffset = 0) => {
  const messageString = message.toString();
  updateErrorOutputs(
    errorOutputs,
    command.index + indexOffset,
    command,
    undefined,
    messageString,
  );
};

const subscriberClose = (
  close,
  errorOutputs,
  commandOutputs,
  indexOffset = 0,
) => {
  const index = close.index + indexOffset;
  updateCommandOutputs(commandOutputs, index, close);
  if (close.exitCode > 0) {
    updateErrorOutputs(errorOutputs, index, close.command, close.exitCode);
  }
};

function subscribeToEvents(
  commands,
  errorOutputs,
  commandOutputs,
  indexOffset = 0,
) {
  commands.forEach((command) => {
    try {
      command.error.subscribe({
        next: (message) => {
          subscriber(command, message, errorOutputs, indexOffset);
        },
      });

      command.stderr.subscribe({
        next: (message) => {
          subscriber(command, message, errorOutputs, indexOffset);
        },
      });

      command.close.subscribe({
        next: (close) => {
          subscriberClose(close, errorOutputs, commandOutputs, indexOffset);
        },
      });
    } catch (err) {
      console.error('Error:', err);
    }
  });
}

/**
 * @param {string[]} apps
 * @param {string[]} commandsToRun
 * @param {Object[]} errorOutputs
 * @param {Object[]} commandOutputs
 * @param {Options} options
 * @param {number} indexOffset
 * @returns {Promise<void>}
 */
async function executeCommads(
  apps,
  commandsToRun,
  errorOutputs,
  commandOutputs,
  options,
  indexOffset = 0,
) {
  if (!apps.length || errorOutputs.length || commandsToRun.length === 0) {
    return;
  }

  const { commands, result } = runConcurrentCommands(commandsToRun, options);
  subscribeToEvents(commands, errorOutputs, commandOutputs, indexOffset);
  await result;
}

/**
 *
 * @param {*} program
 * @param {*} skipApps
 * @returns {{ apps: string[]; options: Options }}
 */
function setupCli(program, nestCliJson, skipApps = []) {
  const options = program.opts();
  let apps = options.apps === true ? [] : options.apps || [];

  let isAll = false;
  if (!apps.length) {
    console.log('No apps specified with the --apps argument, using all apps');
    isAll = true;
    apps = Object.keys(nestCliJson.projects).filter(
      (name) =>
        nestCliJson.projects[name].type === 'application' &&
        !skipApps.includes(name),
    );
  }

  console.debug('Command arguments:', apps, options);

  return { apps, options, isAll };
}

function addCommand(commandList, commandObj, isEnabled) {
  if (isEnabled) {
    commandList.push(commandObj);
  }
}

/**
 *
 * @param {Options} options
 * @param {*} command
 * @param {string} app - It is needed when it's an app-specific command
 * @param {boolean} strict - if true, the only option will be used strictly and it won't return true if only is not defined
 * @returns
 */
function checkOnlySelection(options, command, app = '', strict = false) {
  return (
    (!strict && !options.only) ||
    options.only?.split(',').some((only) => command === only) ||
    (app &&
      options.only?.split(',').some((only) => `${app}:${command}` === only))
  );
}

/**
 *
 * @param {Options} options
 * @param {*} command
 * @param {string} app - It is needed when it's an app-specific command
 * @returns
 */
function checkSkipSelection(options, command, app = '') {
  return (
    options.skip &&
    (options.skip.split(',').some((skip) => command === skip) ||
      (app &&
        options.skip.split(',').some((skip) => `${app}:${command}` === skip)))
  );
}

module.exports = {
  checkOnlySelection,
  checkSkipSelection,
  totalMemory,
  totalMemoryInMB,
  numCores,
  executeCommads,
  printOutputs,
  setupCli,
  addCommand,
  programOptionFactory,
  CommandEnum,
};
