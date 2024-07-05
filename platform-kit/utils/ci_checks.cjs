const { program } = require('commander');
const {
  executeCommads,
  printOutputs,
  totalMemoryInMB,
  setupCli,
  addCommand,
  checkOnlySelection,
  checkSkipSelection,
  CommandEnum,
  programOptionFactory,
} = require('../../scripts/src/ci_checks_lib.cjs');
const nestCliJson = require('../nest-cli.json');

// Apps to skip
const skipApps = ['_cli', 'all'];

/**
 * This apps must be fixed or removed, so we don't want to explicitly throw error if selected
 */
const notAllowedApps = [];

const PlatformCommandEnum = {
  ...CommandEnum,
};

// Commander setup for CLI options
programOptionFactory(PlatformCommandEnum).parse(process.argv);

/**
 * @typedef {import('./ci-checks-lib.cjs').Options} Options
 */

/**
 *
 * @param {string[]} apps
 * @param {Options} options
 */
const createInitialCommands = (apps, options) => {
  const joinedApps = apps.join(',');
  const commands = [];

  addCommand(
    commands,
    {
      name: CommandEnum.Build,
      command: `BUILD_APPS=${joinedApps} npm run build all`,
    },
    checkOnlySelection(options, CommandEnum.Build) &&
      !checkSkipSelection(options, CommandEnum.Build) &&
      !options.onlyJest,
  );

  addCommand(
    commands,
    {
      name: CommandEnum.BuildWatch,
      command: `BUILD_APPS=${joinedApps} npm run build:watch all`,
    },
    checkOnlySelection(options, CommandEnum.BuildWatch, undefined, true),
  );

  addCommand(
    commands,
    {
      name: CommandEnum.LintLibs,
      command: `npm run lint:libs -- ${options.noFix ? '' : '--fix'}`,
    },
    checkOnlySelection(options, CommandEnum.LintLibs) &&
      !checkSkipSelection(options, CommandEnum.LintLibs) &&
      !options.skipLibs &&
      !options.onlyDeploy &&
      !options.onlyJest,
  );

  addCommand(
    commands,
    {
      name: CommandEnum.TestLibsCov,
      command: `npm run test:cov libs`,
    },
    checkOnlySelection(options, CommandEnum.TestLibsCov) &&
      !checkSkipSelection(options, CommandEnum.TestLibsCov) &&
      !options.skipLibs &&
      !options.onlyDeploy &&
      !options.skipJestChecks,
  );

  addCommand(
    commands,
    {
      name: CommandEnum.LintApps,
      command: `npm run lint:path --lintpath=apps/${
        apps.length > 1 ? `{${joinedApps}}` : apps[0]
      }  -- ${options.noFix ? '' : '--fix'}`,
    },
    checkOnlySelection(options, CommandEnum.LintApps) &&
      !checkSkipSelection(options, CommandEnum.LintApps) &&
      !options.onlyDeploy &&
      !options.onlyJest,
  );

  addCommand(
    commands,
    {
      name: CommandEnum.TestAppsCov,
      command: `NODE_OPTIONS="--max-old-space-size=${totalMemoryInMB}" npm run test:cov -- --testTimeout=100000 --ci --proj=${joinedApps}`,
    },
    checkOnlySelection(options, CommandEnum.TestAppsCov) &&
      !checkSkipSelection(options, CommandEnum.TestAppsCov) &&
      !options.onlyDeploy &&
      !options.skipJestChecks,
  );

  addCommand(
    commands,
    {
      name: CommandEnum.Migrate,
      command: `npm run cli platform migrate -- --apps=${joinedApps}`,
    },
    checkOnlySelection(options, CommandEnum.Migrate) &&
      !checkSkipSelection(options, CommandEnum.Migrate) &&
      !options.onlyDeploy &&
      !options.onlyJest,
  );

  return commands;
};

const createE2ECommands = (apps, options) => {
  const commands = [];

  apps.flatMap((app) => {
    addCommand(
      commands,
      {
        name: `${app}:${CommandEnum.TestAppsE2E}`,
        command: `NODE_OPTIONS="--max-old-space-size=${totalMemoryInMB}" npm run test:e2e -- --testTimeout=100000 ${app}`,
      },
      checkOnlySelection(options, CommandEnum.TestAppsE2E, app) &&
        !checkSkipSelection(options, CommandEnum.TestAppsE2E, app) &&
        !options.onlyDeploy &&
        !options.skipJestChecks,
    );
  });

  return commands;
};

/**
 *
 * @param {string[]} apps
 * @param {Options} options
 */
const createAppCommands = (apps, options) => {
  const commands = [];

  apps.flatMap((app) => {
    addCommand(
      commands,
      {
        name: `${app}:${CommandEnum.DryRun}`,
        command: `APP_DRY_RUN=true npm run start:dist ${app}`,
      },
      checkOnlySelection(options, CommandEnum.DryRun, app) &&
        !checkSkipSelection(options, CommandEnum.DryRun, app) &&
        !options.onlyDeploy &&
        !options.onlyJest,
    );
  });

  return commands;
};

async function main() {
  const errorOutputsInitial = {};
  const errorOutputsApp = {};
  const commandOutputs = {};
  console.time('CI-Script');

  try {
    const { apps, options, isAll } = setupCli(program, nestCliJson, skipApps);

    if (apps.some((app) => notAllowedApps.includes(app))) {
      console.error(
        `ERROR: The following apps are not allowed to be run: ${notAllowedApps.join(
          ', ',
        )}`,
      );
      process.exit(1);
    }

    const initialCommands = createInitialCommands(apps, options);
    const e2eCommands = createE2ECommands(apps, options);
    const appCommands = createAppCommands(apps, options, isAll);

    const commandsToRun = [
      ...initialCommands,
      ...appCommands,
      ...e2eCommands,
    ].map((c) => c.name);

    if (commandsToRun.length === 0) {
      console.log(
        'No commands to run, if you are using the --only option please specify one of the following: \n',
        Object.values(CommandEnum).join(',\n'),
      );
      process.exit(1);
    }

    console.debug('Commands to run:', commandsToRun);

    console.timeLog('CI-Script', 'Start initial commands');

    try {
      /**
       * Initial commands
       */
      await executeCommads(
        apps,
        initialCommands,
        errorOutputsInitial,
        commandOutputs,
        options,
      );
    } catch (error) {
      /**
       * Throw error if the --no-kill-others option is not enabled
       */
      if (options.killOthers) throw error;
    }

    console.timeLog('CI-Script', 'End initial commands, start app commands');

    try {
      /**
       * E2E commands
       */
      await executeCommads(
        apps,
        e2eCommands,
        errorOutputsApp,
        commandOutputs,
        {
          ...options,
          maxProcesses: 1, // E2E tests are not parallelizable
        },
        initialCommands.length,
      );
    } catch (error) {
      /**
       * Throw error if the --no-kill-others option is not enabled
       */
      if (options.killOthers) throw error;
    }

    /**
     * App commands (they require the initial commands to be executed)
     */
    await executeCommads(
      apps,
      appCommands,
      errorOutputsApp,
      commandOutputs,
      options,
      initialCommands.length,
    );

    const commandsWithErrors = printOutputs(
      {
        ...errorOutputsInitial,
        ...errorOutputsApp,
      },
      commandOutputs,
    );

    console.timeEnd('CI-Script');

    process.exit(commandsWithErrors.length > 0 ? 1 : 0);
  } catch (err) {
    if (!Array.isArray(err)) {
      console.error(
        'Error:',
        // Array.isArray(err)
        // ? /* err.map((e) => ({ command: e.command.command, exitCode: e.exitCode })) */ '' :
        err,
      );
    }

    printOutputs(
      {
        ...errorOutputsInitial,
        ...errorOutputsApp,
      },
      commandOutputs,
    );

    console.timeEnd('CI-Script');
    process.exit(1);
  }
}

main();
