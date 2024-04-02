import { MigrationOptions, MigrationSelection } from '@nestjs-yalc/database';
import { ClassType } from '@nestjs-yalc/types/globals.d.js';
import { AppConfigService } from '@nestjs-yalc/app/app-config.service.js';
import {
  curriedExecuteAppFunction,
  curriedExecuteStandaloneFunction,
} from '@nestjs-yalc/app/app.helper.js';
import { IServiceWithTypeORMConf } from '@nestjs-yalc/app/conf.type.js';
import { IDbService, IDbRunnerService } from './db-cli.helper';

export function addEnvPayloadForMigrationOptions(
  configService: AppConfigService<IServiceWithTypeORMConf>,
  options?: MigrationOptions,
): MigrationOptions {
  if (!options?.selMigrations) {
    // use the options selected migrations if any, or check the env variable
    // if both are undefined, the migration will execute all of them
    return {
      ...options,
      selMigrations: configService.values.migrationPayload,
    };
  }

  return options;
}

/**
 *
 * STANDALONE VERSION
 *
 */

/**
 * Helper function to execute the creation of the database together with the
 * migration process
 */
export async function executeStandaloneDbMigrations(
  appAlias: string,
  appModule: any,
  service: ClassType<IDbService | IDbRunnerService>,
  options: { migrations?: MigrationSelection; dropDb?: boolean },
) {
  if (options?.dropDb) {
    await executeStandaloneDbDrop(appAlias, appModule, service);
  }

  const executeStandaloneFunction = await executeStandaloneDbCreation(
    appAlias,
    appModule,
    service,
  );

  await executeStandaloneFunction(service, async (service: IDbService) => {
    await service.migrate({ selMigrations: options.migrations });
  });

  return executeStandaloneFunction;
}

export async function executeStandaloneDbSeed(
  appAlias: string,
  appModule: any,
  service: ClassType<IDbService | IDbRunnerService>,
  options: {
    dropDb?: boolean;
  },
) {
  if (options?.dropDb) {
    await executeStandaloneDbDrop(appAlias, appModule, service);
  }

  const executeStandaloneFunction = await executeStandaloneDbMigrations(
    appAlias,
    appModule,
    service,
    {},
  );

  await executeStandaloneFunction(service, async (service: IDbService) => {
    await service.seed();
  });

  return executeStandaloneFunction;
}

export async function executeStandaloneDbCreation(
  appAlias: string,
  appModule: any,
  service: ClassType<IDbService | IDbRunnerService>,
) {
  // we neet a schemaless connection while creating the schema
  process.env.TYPEORM_NO_SEL_DB = 'true';
  const executeStandaloneFunction = await curriedExecuteStandaloneFunction(
    appModule,
    appAlias,
  );

  await executeStandaloneFunction(service, async (service: IDbService) => {
    await service.create();
  });
  process.env.TYPEORM_NO_SEL_DB = 'false';

  return executeStandaloneFunction;
}

export async function executeStandaloneDbDrop(
  appAlias: string,
  appModule: any,
  service: ClassType<IDbService | IDbRunnerService>,
) {
  // we neet a schemaless connection while creating the schema
  process.env.TYPEORM_NO_SEL_DB = 'true';
  const executeStandaloneFunction = await curriedExecuteStandaloneFunction(
    appModule,
    appAlias,
  );

  await executeStandaloneFunction(service, async (service: IDbService) => {
    await service.drop();
  });
  process.env.TYPEORM_NO_SEL_DB = 'false';

  return executeStandaloneFunction;
}

/**
 *
 * APP VERSION (with controllers)
 *
 */

/**
 * Helper function to execute the creation of the database together with the
 * migration process
 */
export async function executeAppDbMigrations(
  appAlias: string,
  appModule: any,
  service: ClassType<IDbService | IDbRunnerService>,
  options: { migrations?: MigrationSelection },
) {
  const executeAppFunction = await executeAppDbCreation(
    appAlias,
    appModule,
    service,
  );

  await executeAppFunction(service, async (service: IDbService) => {
    await service.migrate({ selMigrations: options.migrations });
  });

  return executeAppFunction;
}

export async function executeAppDbSeed(
  appAlias: string,
  appModule: any,
  service: ClassType<IDbService | IDbRunnerService>,
  options: {
    dropDb?: boolean;
  },
) {
  if (options?.dropDb) {
    await executeAppDbDrop(appAlias, appModule, service);
  }

  const executeAppFunction = await executeAppDbMigrations(
    appAlias,
    appModule,
    service,
    {},
  );

  await executeAppFunction(service, async (service: IDbService) => {
    await service.seed();
  });

  return executeAppFunction;
}

export async function executeAppDbCreation(
  appAlias: string,
  appModule: any,
  service: ClassType<IDbService | IDbRunnerService>,
) {
  // we neet a schemaless connection while creating the schema
  process.env.TYPEORM_NO_SEL_DB = 'true';
  const executeAppFunction = await curriedExecuteAppFunction(
    appAlias,
    appModule,
  );

  await executeAppFunction(service, async (service: IDbService) => {
    await service.create();
  });
  process.env.TYPEORM_NO_SEL_DB = 'false';

  return executeAppFunction;
}

export async function executeAppDbDrop(
  appAlias: string,
  appModule: any,
  service: ClassType<IDbService | IDbRunnerService>,
) {
  // we neet a schemaless connection while creating the schema
  process.env.TYPEORM_NO_SEL_DB = 'true';
  const executeFunction = await curriedExecuteAppFunction(appAlias, appModule);

  await executeFunction(service, async (service: IDbService) => {
    await service.drop();
  });
  process.env.TYPEORM_NO_SEL_DB = 'false';

  return executeFunction;
}
