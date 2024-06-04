/* istanbul ignore file */

import * as Engine from 'typeorm-model-generator/dist/src/Engine.js';
import * as ConnOptions from 'typeorm-model-generator/dist/src/IConnectionOptions.js';
import { getDefaultGenerationOptions } from 'typeorm-model-generator/dist/src/IGenerationOptions.js';
import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions.js';
import { isMysqlConnectionOption } from './db-ops.service.js';
import { LoggerService } from '@nestjs/common';
import { DataSource } from 'typeorm';

type IConnectionOptions = ConnOptions.default;

export class ModelGenerateService {
  constructor(
    _options: any,
    private loggerService: LoggerService,
    private dbConnections: { conn: DataSource; dbName: string }[],
  ) {}

  public async generate(dbName: string, tables: string[], genPath?: string) {
    this.loggerService.debug?.('Exporting db to TypeORM entities...');

    const driver = Engine.createDriver('mysql');

    const mysqlConnectionOptions: MysqlConnectionOptions[] = [];
    this.dbConnections.forEach(({ conn: { options } }) => {
      if (isMysqlConnectionOption(options) && dbName === options.database) {
        mysqlConnectionOptions.push(options);
      }
    });

    if (!mysqlConnectionOptions.length) {
      this.loggerService.error(
        `There is no MySQL database connection configured for ${dbName}. ` +
          'Please refer to the documentation for Database Connection Setup',
      );
      return;
    }

    for (const options of mysqlConnectionOptions) {
      const connOptions: IConnectionOptions = {
        ...ConnOptions.getDefaultConnectionOptions(),
        host: options.host ?? '127.0.0.1',
        port: options.port ?? 3306,
        password: options.password ?? '',
        user: options.username ?? '',
        databaseNames: options.database ? [options.database] : [],
        databaseType: options.type,
        onlyTables: tables,
      };

      const generationOptions = {
        ...getDefaultGenerationOptions(),
      };

      if (genPath) {
        generationOptions.resultsPath = genPath;
      }

      generationOptions.resultsPath += `/${dbName}`;

      await Engine.createModelFromDatabase(
        driver,
        connOptions,
        generationOptions,
      );
    }

    this.loggerService.debug?.('Export complete!');
  }
}
