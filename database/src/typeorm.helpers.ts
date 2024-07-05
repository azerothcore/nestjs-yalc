import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { PostgresConnectionCredentialsOptions } from 'typeorm/driver/postgres/PostgresConnectionCredentialsOptions.js';
import { TypeORMLogger } from '@nestjs-yalc/logger';
import { IYalcBaseAppOptions } from '@nestjs-yalc/app/base-app.interface.js';
import { DataSource, MigrationInterface } from 'typeorm';
import { ClassType } from 'nestjs-yalc';
import { YalcEventService } from '@nestjs-yalc/event-manager/event.service.js';

export const setGlobalMigrationClasses = (
  connName: string,
  classes: ClassType<MigrationInterface>[],
) => {
  global.TypeORM_Migration_classes = {
    ...global.TypeORM_Migration_classes,
    [connName]: classes,
  };
};

export const yalcTypeOrmPostgresOptions = (
  name: string,
  postgresConf: PostgresConnectionCredentialsOptions,
  logger: YalcEventService,
  appOptions?: IYalcBaseAppOptions,
): TypeOrmModuleOptions & { type: 'postgres' } => {
  return {
    name,
    type: 'postgres',
    logger: new TypeORMLogger(logger),
    migrations:
      appOptions?.migrations || global.TypeORM_Migration_classes?.[name],
    ...postgresConf,
  };
};

export const getSchemNameFromDatasource = (
  dataSource: DataSource,
): string | undefined => {
  switch (dataSource.options.type) {
    case 'postgres':
      return dataSource.driver.schema;
    case 'mysql':
    default:
      return dataSource.driver.database;
  }
};
