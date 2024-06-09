import { MigrationOptions, MigrationSelection } from '@nestjs-yalc/database';
import { ClassType } from '@nestjs-yalc/types/globals.d.js';
import { AppConfigService } from '@nestjs-yalc/app/app-config.service.js';
import {
  IExecutionOption,
  curriedExecuteAppFunction,
  curriedExecuteStandaloneAppFunction,
} from '@nestjs-yalc/app/app.helper.js';
import { IDbService, IDbRunnerService } from './db-cli.helper';

export function addEnvPayloadForMigrationOptions(
  configService: AppConfigService<any>,
  options?: MigrationOptions,
): MigrationOptions {
  if (!options?.selMigrations) {
    // use the options selected migrations if any, or check the env variable
    // if both are undefined, the migration will execute all of them
    return {
      ...options,
      selMigrations: configService.get().migrationPayload,
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
  options: {
    migrations?: MigrationSelection;
    dropDb?: boolean;
  } & IExecutionOption,
) {
  if (options?.dropDb) {
    await executeStandaloneDbDrop(appAlias, appModule, service, {
      ...options,
      appOptions: {
        ...(options.appOptions ?? {}),
        isDirectExecution: true,
      },
      closeApp: true,
    });
  }

  const executeStandaloneFunction = await executeStandaloneDbCreation(
    appAlias,
    appModule,
    service,
    {
      ...options,
      dropDb: false,
      closeApp: true,
    },
  );

  await executeStandaloneFunction(
    service,
    async (service: IDbService) => {
      await service.migrate({ selMigrations: options.migrations });
    },
    {
      closeApp: true,
      ...options,
    },
  );

  return executeStandaloneFunction;
}

export async function executeStandaloneDbSeed(
  appAlias: string,
  appModule: any,
  service: ClassType<IDbService | IDbRunnerService>,
  options: {
    dropDb?: boolean;
    runMigrations?: boolean;
  } & IExecutionOption,
) {
  let executeStandaloneFunction;
  if (options?.runMigrations === false ?? true) {
    executeStandaloneFunction = await curriedExecuteStandaloneAppFunction(
      appAlias,
      appModule,
    );
  } else {
    executeStandaloneFunction = await executeStandaloneDbMigrations(
      appAlias,
      appModule,
      service,
      {
        ...options,
        closeApp: true,
      },
    );
  }

  await executeStandaloneFunction(
    service,
    async (service: IDbService) => {
      await service.seed();
    },
    { closeApp: true, ...options },
  );

  return executeStandaloneFunction;
}

export async function executeStandaloneDbCreation(
  appAlias: string,
  appModule: any,
  service: ClassType<IDbService | IDbRunnerService>,
  options?: {
    dropDb?: boolean;
  } & IExecutionOption,
) {
  // we neet a schemaless connection while creating the schema
  process.env.TYPEORM_NO_SEL_DB = 'true';
  const executeStandaloneFunction = await curriedExecuteStandaloneAppFunction(
    appAlias,
    appModule,
    options,
  );

  if (options?.dropDb) {
    await executeStandaloneFunction(
      service,
      async (service: IDbService) => {
        await service.drop();
      },
      { closeApp: true, ...options },
    );
  }

  await executeStandaloneFunction(
    service,
    async (service: IDbService) => {
      await service.create();
    },
    {
      closeApp: true,
      ...options,
    },
  );
  process.env.TYPEORM_NO_SEL_DB = 'false';

  return executeStandaloneFunction;
}

export async function executeStandaloneDbDrop(
  appAlias: string,
  appModule: any,
  service: ClassType<IDbService | IDbRunnerService>,
  options?: IExecutionOption,
) {
  // we neet a schemaless connection while creating the schema
  process.env.TYPEORM_NO_SEL_DB = 'true';
  const executeStandaloneFunction = await curriedExecuteStandaloneAppFunction(
    appAlias,
    appModule,
    options,
  );

  await executeStandaloneFunction(
    service,
    async (service: IDbService) => {
      await service.drop();
    },
    { closeApp: true, ...options },
  );
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
  options: { migrations?: MigrationSelection } & IExecutionOption,
) {
  const executeAppFunction = await executeAppDbCreation(
    appAlias,
    appModule,
    service,
    { ...options, closeApp: true },
  );

  await executeAppFunction(
    service,
    async (service: IDbService) => {
      await service.migrate({ selMigrations: options.migrations });
    },
    { closeApp: true, ...options },
  );

  return executeAppFunction;
}

export async function executeAppDbSeed(
  appAlias: string,
  appModule: any,
  service: ClassType<IDbService | IDbRunnerService>,
  options: {
    dropDb?: boolean;
    runMigrations?: boolean;
  } & IExecutionOption,
) {
  let executeAppFunction;
  if (options?.dropDb) {
    executeAppFunction = await executeAppDbDrop(appAlias, appModule, service, {
      closeApp: true,
    });
  }

  if (options?.runMigrations) {
    executeAppFunction = await executeAppDbMigrations(
      appAlias,
      appModule,
      service,
      { ...options, closeApp: false },
    );
  }

  if (!executeAppFunction) {
    executeAppFunction = await curriedExecuteAppFunction(
      appAlias,
      appModule,
      options,
    );
  }

  await executeAppFunction(
    service,
    async (service: IDbService) => {
      await service.seed();
    },
    { closeApp: true, ...options },
  );

  return executeAppFunction;
}

export async function executeAppDbCreation(
  appAlias: string,
  appModule: any,
  service: ClassType<IDbService | IDbRunnerService>,
  options?: IExecutionOption,
) {
  // we neet a schemaless connection while creating the schema
  process.env.TYPEORM_NO_SEL_DB = 'true';
  const executeAppFunction = await curriedExecuteAppFunction(
    appAlias,
    appModule,
    options,
  );

  await executeAppFunction(
    service,
    async (service: IDbService) => {
      await service.create();
    },
    { closeApp: true, ...options },
  );
  process.env.TYPEORM_NO_SEL_DB = 'false';

  return executeAppFunction;
}

export async function executeAppDbDrop(
  appAlias: string,
  appModule: any,
  service: ClassType<IDbService | IDbRunnerService>,
  options?: IExecutionOption,
) {
  // we neet a schemaless connection while creating the schema
  process.env.TYPEORM_NO_SEL_DB = 'true';
  const executeFunction = await curriedExecuteAppFunction(
    appAlias,
    appModule,
    options,
  );

  await executeFunction(
    service,
    async (service: IDbService) => {
      await service.drop();
    },
    { closeApp: true, ...options },
  );
  process.env.TYPEORM_NO_SEL_DB = 'false';

  return executeFunction;
}
