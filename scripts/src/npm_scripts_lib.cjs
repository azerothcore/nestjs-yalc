const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const script = process.argv.slice(2);

const run = (options = { doNotExitOnError: false }, ...commands) =>
  commands.forEach((command) => {
    try {
      execSync(command, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '../'),
      });
    } catch (e) {
      console.log('sdterr', e.stderr.toString());
      if (!options?.doNotExitOnError) process.exit(1);
      else throw e;
    }
  });

/**
 *
 * @param {*} source
 * @returns {string[]}
 */
const listDirectories = (source) =>
  fs
    .readdirSync(source, {
      withFileTypes: true,
    })
    .reduce((a, c) => {
      c.isDirectory() && a.push(c.name);
      return a;
    }, []);

/**
 *
 * @param {string[]} skip
 */
const installDeps = (skip) => () => {
  const projectsPath = path.resolve(`${__dirname}/../projects`);

  const directories = listDirectories(projectsPath);

  run.apply(
    null,
    directories
      .filter((d) => !skip.includes(d))
      .map((d) => {
        if (fs.existsSync(`${projectsPath}/${d}/yarn.lock`)) {
          return `yarn --cwd ${projectsPath}/${d} install`;
        }

        return `npm install  --prefix ${projectsPath}/${d}  --engine-strict`;
      }),
  );
};

// Function to check for Debian-based system
function isDebianBased() {
  try {
    // Check if the platform is Linux
    if (os.platform() !== 'linux') {
      console.log('Not running on Linux');
      return false;
    }

    // Check for APT
    execSync('which apt');
    console.log('Debian-based system with APT found');
    return true;
  } catch (error) {
    console.log('Not a Debian-based system or APT not found');
    return false;
  }
}

const gitSubmoduleSetup = () => {
  run(
    'git submodule update --init --recursive && git submodule update --recursive && git submodule sync',
  );
};

const gitConfigSetup = () => {
  run(
    'git config --global submodule.recurse true',
    'git config --global core.autocrlf input',
    'git config --global fetch.prune true',
  );
};

/**
 * @typedef {Object} Options
 * @property {String} subPath
 * @property {Boolean} isCli
 * @property {Boolean} noSpace - avoid space between the original command and the arguments, useful to complete a prefixed argument
 * @property {Boolean} noCd - do not cd into the app folder
 */

/**
 *
 * @param {import('commander').Command} program
 * @param {String | Function} originalCommand
 * @param {String} npmCommand
 * @param {Options?} options - if we need to cd into a subpath of the project rootPath
 */
const nestJsCustomCommand = (
  program,
  originalCommand,
  npmCommand,
  projects,
  options = {},
) => {
  program
    .command(npmCommand)
    .description(`Run ${npmCommand} command in a monorepo fashion`)
    .argument('<app>', 'App to process')
    .arguments('[commandArgs...]', 'Command arguments', [])
    .allowUnknownOption()
    .action(async (/** @type {string} */ app, commandArgs) => {
      const { default: chalk } = await import('chalk');

      // fix a limitation of commanderjs
      // that can't handle optional arguments + variadic properly
      if (app.startsWith('--')) {
        commandArgs.push(app);
        app = commandArgs.find((arg) => !arg.startsWith('--'));
      }

      /**
       *
       * @param {string} rootPath
       * @returns {string}
       */
      const resolveCommand = (rootPath) =>
        typeof originalCommand === 'function'
          ? originalCommand(rootPath)
          : originalCommand;

      const runCommand = (project) => {
        const rootPath = project.root;
        const prefix = !options.noCd
          ? `cd ${rootPath}/${options.subPath ?? ''}; `
          : '';

        // console.log(app, commandArgs);
        let cmd = `${prefix}${resolveCommand(rootPath)}${
          options.noSpace ? '' : ' '
        }${commandArgs.join(' ')}`;

        console.log(`Running: ${cmd}`);
        // do not crash on command error
        try {
          run({ doNotExitOnError: true }, cmd);
        } catch (e) {
          // 100 is the status code that we use for the 'unkown command' error in our cli.ts
          if (e.status !== 100) process.exit(1);
        }
      };

      if (app === 'all' && !resolveCommand().includes('cli.ts')) {
        Object.values(projects)
          .filter((p) => p.type === 'application')
          .forEach(runCommand);
      } else {
        const project = projects[app];

        if (!project) {
          console.error(chalk.red(`ERROR: Project ${app} doesn't exist`));
          process.exit(1);
        }

        runCommand(projects[app]);
      }
    });
};

module.exports = {
  gitSubmoduleSetup,
  gitConfigSetup,
  run,
  listDirectories,
  installDeps,
  isDebianBased,
  script: script[0],
  nestJsCustomCommand,
};
