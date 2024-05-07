/* istanbul ignore file */

import { Injectable, Provider } from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import { DataSource, DataSourceOptions } from 'typeorm';
import { dbConnectionMap } from './conn.helper.js';
import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions.js';
import { getDataSourceToken } from '@nestjs/typeorm';

/**
 * Application service
 */
@Injectable()
export class DbOpsService {
  constructor(
    _options: any,
    private loggerService: LoggerService,
    private dbConnections: { conn: DataSource; dbName: string }[],
  ) {}

  public async closeAllConnections() {
    for (const v of this.dbConnections) {
      if (v.conn.isInitialized) await v.conn.destroy();
    }
  }

  public async create() {
    for (const v of this.dbConnections) {
      const schemaName = v.conn.driver.schema;
      if (!schemaName) {
        this.loggerService.log(`Schema name not defined for ${v.dbName}`);
        continue;
      }

      const queryRunner = v.conn.createQueryRunner();
      this.loggerService.log('Creating ' + schemaName);
      await queryRunner.createSchema(schemaName, true);
    }
  }

  public async sync(throwOnError = false, dropTables = false) {
    this.loggerService.debug?.('Synchronizing db...');
    for (const v of this.dbConnections) {
      this.loggerService.debug?.(`Synchronizing ${v.dbName}...`);
      try {
        await v.conn.synchronize(dropTables);
      } catch (e) {
        if (throwOnError) {
          throw e;
        } else {
          this.loggerService.debug?.(`${v.dbName} not Synchronized`);
        }
      }
    }

    this.loggerService.debug?.('Synchronze completed!');
  }

  public async drop() {
    for (const v of this.dbConnections) {
      const queryRunner = v.conn.createQueryRunner();
      if (!v.conn.driver.schema) {
        this.loggerService.error(`Schema name not defined for ${v.dbName}`);
        continue;
      }

      this.loggerService.debug?.(`Dropping ${v.conn.driver.schema}`);
      await queryRunner.dropSchema(v.conn.driver.schema.toString(), true, true);
    }
  }
}

export function isMysqlConnectionOption(
  options: DataSourceOptions | MysqlConnectionOptions,
): options is MysqlConnectionOptions {
  return (options as DataSourceOptions).type === 'mysql';
}

export const DbOpsServiceFactory = (
  loggerServiceToken: string,
  connectionTokens: any[],
): Provider => ({
  provide: DbOpsService,
  useFactory: async (
    loggerService: LoggerService,
    ...dbConnections: DataSource[]
  ) => {
    return new DbOpsService(
      {},
      loggerService,
      dbConnections.map(dbConnectionMap),
    );
  },
  inject: [loggerServiceToken, ...connectionTokens.map(getDataSourceToken)],
});
