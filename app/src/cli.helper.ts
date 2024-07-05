import 'source-map-support/register';
import { Command } from 'commander';
import { commandWithErrors } from '@nestjs-yalc/utils';
import { MigrationSelection } from '@nestjs-yalc/database/db-migrate.service.js';
import _ from 'lodash';
import { ClassType } from '@nestjs-yalc/types/globals.d.js';
import {
  IDbService,
  IDbRunnerService,
} from '@nestjs-yalc/database/db-cli.helper.js';
import {
  executeStandaloneDbSeed,
  executeStandaloneDbMigrations,
  executeStandaloneDbCreation,
  executeStandaloneDbDrop,
} from '@nestjs-yalc/database/db-fp.lib.js';

// used in our npm_scripts_lib to know when to exit the process
export const UNKOWN_COMMAND_EXIT_CODE = 100;

export class YalcCli {
  program: Command;

  constructor() {
    this.program = new Command('cli').on('command:*', function (operands) {
      // eslint-disable-next-line no-console
      console.error(`error: unknown command '${operands[0]}'`);
      process.exitCode = UNKOWN_COMMAND_EXIT_CODE;
    });
  }

  commandFactory(commandName: string, description: string) {
    return this.program
      .command(commandName)
      .description(description)
      .allowUnknownOption(true);
  }

  dbMigrationCommandFactory(action: {
    ({ migrations }: { migrations?: MigrationSelection }): Promise<any | void>;
  }) {
    return (
      this.commandFactory('migrate', 'Migrate tables')
        .option(
          '-m, --migrations <json>',
          'Provide a json to select migrations to run',
          JSON.parse,
        )
        .option('-d, --drop-db', 'Drop db before migrate', false)
        // .option('-r, --reseed', 'Reseed the database after the migration', false)
        .action(commandWithErrors(action))
    );
  }

  dbSeedCommandFactory(action: {
    ({ dropDb }: { dropDb?: boolean }): Promise<any | void>;
  }) {
    return this.commandFactory('seed', 'Seed database')
      .option('-d, --drop-db', 'Drop the database before seeding', false)
      .action(commandWithErrors(action));
  }

  dbCreateCommandFactory(action: { (): Promise<any | void> }) {
    return this.commandFactory('create', 'Create database').action(
      commandWithErrors(action),
    );
  }

  dbDropCommandFactory(action: { (): Promise<any | void> }) {
    return this.commandFactory('drop', 'Drop database').action(
      commandWithErrors(action),
    );
  }

  dbDefaultCommandsFactory(
    appAlias: string,
    appModule: any,
    service: ClassType<IDbService | IDbRunnerService>,
  ) {
    this.dbSeedCommandFactory(
      // the curry is needed to allow the command to pass the command options later
      _.curry(executeStandaloneDbSeed)(appAlias, appModule, service),
    );

    this.dbMigrationCommandFactory(
      // the curry is needed to allow the command to pass the selected migrations later
      _.curry(executeStandaloneDbMigrations)(appAlias, appModule, service),
    );

    this.dbCreateCommandFactory(
      executeStandaloneDbCreation.bind(null, appAlias, appModule, service),
    );

    this.dbDropCommandFactory(
      executeStandaloneDbDrop.bind(null, appAlias, appModule, service),
    );
  }

  async parseAsync() {
    await this.program.parseAsync(process.argv);
  }
}
