import fs from 'fs-extra';
import glob from 'glob';
import replace from 'replace-in-file';
import path from 'path';
import { execSync } from 'child_process';
import inquirer from 'inquirer';
import { program } from 'commander';

program.version('0.0.1');

program
  .command('create')
  .description('Create a new module')
  .option('-n, --no-adjust', 'Do not adjust nest-cli.json')
  .action(async (options) => {
    const userInput = await getUserInput();
    await createModule(userInput, options.adjust);
  });

program.parse(process.argv);

/**
 * @typedef {'api-client'|'api-module'|'app-module'|'cron-module'} ModuleType
 * @typedef {{type: ModuleType, newFolderName: string, destination: string}} UserInput
 */

/**
 * Prompts the user to select the module type and enter the new folder name and destination
 * @returns {Promise<UserInput>} The user input
 */
async function getUserInput() {
  return inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'Select the type of module you want to create',
      choices: ['api-client', 'api-module', 'app-module', 'cron-module'],
    },
    {
      type: 'input',
      name: 'newFolderName',
      message: 'Enter the name of the new module',
      validate: (input) => {
        if (
          fs.existsSync(path.join(process.cwd(), './platform-modules', input))
        ) {
          return 'A module with this name already exists. Please choose a different name.';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'packagePrefix',
      message: 'Enter the package prefix for the new module',
      default: '@nestjs-yalc',
    },
    {
      type: 'input',
      name: 'destination',
      message: 'Enter the destination path for the new module',
      default: '.',
    },
  ]);
}

/**
 * Creates a new module by copying, renaming, and adjusting files, installing dependencies, and optionally updating nest-cli.json
 * @param {UserInput} userInput The user input
 * @param {boolean} adjustNestConfig Whether to adjust nest-cli.json
 */
async function createModule(
  { type, newFolderName, destination, packagePrefix },
  adjustNestConfig,
) {
  const baseDir = path.join(
    process.cwd(),
    './platform-modules',
    `base-${type}`,
  );
  const newDir = path.join(destination, newFolderName);

  const operations = [
    copyModule.bind(null, baseDir, newDir),
    renameFiles.bind(null, `base-${type}`, newFolderName, newDir),
    replaceInFiles.bind(null, `base-${type}`, newFolderName, newDir),
    adjustPackageJson.bind(null, packagePrefix, newFolderName, newDir),
    installDependencies.bind(null, newDir),
  ];

  if (adjustNestConfig) {
    operations.push(updateNestConfig.bind(null, type, newFolderName));
  }

  for (const operation of operations) {
    await operation();
  }
}

/**
 * Copy a directory from source to destination
 * @param {string} sourceDir The source directory
 * @param {string} destinationDir The destination directory
 * @returns {Promise<void>}
 */
async function copyModule(sourceDir, destinationDir) {
  await fs.copy(sourceDir, destinationDir);
}

/**
 * Rename files with the old name to the new name within a directory
 * @param {ModuleType} oldName The old name (type)
 * @param {string} newName The new name
 * @param {string} dir The directory where to operate
 */
function renameFiles(oldName, newName, dir) {
  const filePaths = glob.sync(`${dir}/**/${oldName}.*.ts`);
  filePaths.forEach((filePath) => {
    const newFilePath = filePath.replace(oldName, newName);
    fs.renameSync(filePath, newFilePath);
  });
}

/**
 * Replace the old name with the new name in all .ts files within a directory
 * @param {ModuleType} oldName The old name (type)
 * @param {string} newName The new name
 * @param {string} dir The directory where to operate
 * @returns {Promise<void>}
 */
async function replaceInFiles(oldName, newName, dir) {
  const options = {
    files: `${dir}/**/*.ts`,
    from: new RegExp(oldName, 'g'),
    to: newName,
  };
  await replace(options);
}

/**
 * Adjust the name property in package.json within a directory
 * @param {string} packagePrefix The package prefix
 * @param {string} newName The new name
 * @param {string} dir The directory where to operate
 */
function adjustPackageJson(packagePrefix, newName, dir) {
  const packagePath = path.join(dir, 'package.json');
  const packageJSON = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  packageJSON.name = packagePrefix ? `${packagePrefix}/${newName}` : newName;
  fs.writeFileSync(packagePath, JSON.stringify(packageJSON, null, 2));
}

/**
 * Run `npm install` within a directory
 * @param {string} dir The directory where to run `npm install`
 */
function installDependencies(dir) {
  //execSync(`npm install ./${dir}`, { stdio: 'inherit' });
}

/**
 * Update nest-cli.json with the new module
 * @param {ModuleType} type The type of module
 * @param {string} newName The name of the new module
 */
function updateNestConfig(type, newName) {
  const nestConfigPath = path.join(process.cwd(), './nest-cli.json');
  const nestConfig = JSON.parse(fs.readFileSync(nestConfigPath, 'utf-8'));

  nestConfig.projects[newName] = {
    ...nestConfig.projects[`base-${type}`],
    root: newName,
    sourceRoot: path.join(newName, 'src'),
  };

  fs.writeFileSync(nestConfigPath, JSON.stringify(nestConfig, null, 2));
}
