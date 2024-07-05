/* istanbul ignore file */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck -- TODO: FIX THIS

import { useSeeding } from 'typeorm-seeding';
import { ConfigureOption } from 'typeorm-seeding/dist/connection.js';
import * as common from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { IDbConfType } from './conf.interface.js';
import { getConfNameByConnection } from './conn.helper.js';

/**
 * Application service
 */
@common.Injectable()
export class SeedService {
  constructor(
    private dbConnections: DataSource[],
    private loggerService: common.LoggerService,
    private configService: ConfigService,
    private configPath: string,
  ) {}

  public async closeAllConnections() {
    for (const v of this.dbConnections) {
      if (v.isConnected) await v.close();
    }
  }

  private async clearDatabase(connection: DataSource, name: string) {
    const dbConf = this.configService.get<IDbConfType>(
      getConfNameByConnection(connection.name),
    );

    if (!dbConf?.seeds || dbConf?.seeds.length === 0) return;

    this.resetConnection();

    this.loggerService.debug?.(
      `Clear ${name} on connection: ${connection.name}...`,
    );

    const queryRunner = connection.createQueryRunner();
    this.loggerService.debug?.(`Clear ${name} tables`);
    await Promise.all(
      connection.entityMetadatas.map(async (meta) => {
        const skipTable = await queryRunner.hasTable(meta.tableName);

        if (meta.tableType === 'view' || !skipTable) {
          this.loggerService.debug?.(
            `Skip truncating ${name}.${meta.tableName}`,
          );
          return;
        }
        this.loggerService.debug?.(`Truncating ${name}.${meta.tableName}`);
        await queryRunner.clearTable(meta.tableName);
      }),
    );
    this.loggerService.debug?.(`Database ${name} cleared!`);
  }

  private async seedDatabase(connection: DataSource, name: string) {
    const dbConf = this.configService.get<IDbConfType>(
      getConfNameByConnection(connection.name),
    );

    if (!dbConf?.seeds || dbConf?.seeds.length === 0) return;

    this.loggerService.debug?.(`Seeding: ${name}`);

    const option: ConfigureOption = {
      root: this.configPath,
      configName: 'ormconfig',
      connection: connection.name,
    };

    this.resetConnection();

    await useSeeding(option);

    this.setConnection(connection);

    const seeders = dbConf?.seeds;
    for (const seeder of seeders) {
      const label = `${name}.${seeder.name} execution time:`;
      // eslint-disable-next-line no-console
      console.time(label);
      this.loggerService.debug?.(`Running seeder ${seeder.name} on ${name}`);
      await new seeder().run(connection);
      // eslint-disable-next-line no-console
      console.timeEnd(label);
    }

    this.loggerService.debug?.(`Completed: ${name}`);
  }

  public async seedDatabases(reseed: boolean /*, _databases*/) {
    this.loggerService.debug?.('Seeding db...');

    if (reseed) {
      await Promise.all(
        this.dbConnections.map(async (connection) => {
          if (!connection.options.database) return;
          await this.clearDatabase(
            connection,
            connection.options.database.toString(),
          );
        }),
      );
    }

    const promiseList: { (): Promise<void> }[] = [];
    for (const connection of this.dbConnections) {
      if ((connection.options as any).__seedAsync) {
        promiseList.push(async () => {
          if (!connection.options.database) return;

          await this.seedDatabase(
            connection,
            connection.options.database.toString(),
          );
        });
      } else {
        if (!connection.options.database) continue;
        await this.seedDatabase(
          connection,
          connection.options.database.toString(),
        );
      }
    }

    await Promise.all(promiseList.map((fn) => fn()));

    this.loggerService.debug?.('Seeding completed!');
  }

  /**
   *  Use it to reset connection options to be able to change database connection
   *
   */
  private resetConnection() {
    global['TypeORM_Seeding_Connection'] = {
      configureOption: {
        root: process.cwd(),
        configName: '',
        connection: '',
      },
      ormConfig: undefined,
      connection: undefined,
      overrideConnectionOptions: {},
    };
  }

  private setConnection(connection: DataSource | undefined) {
    global['TypeORM_Seeding_Connection']['connection'] = connection;
  }
}

export const SeedServiceFactory = (
  configPath: string,
  loggerService: string,
  connectionTokens: any[],
): common.Provider => ({
  provide: SeedService,
  useFactory: async (
    configService: ConfigService,
    loggerService: common.LoggerService,
    ...dbConnections: DataSource[]
  ) => {
    return new SeedService(
      dbConnections,
      loggerService,
      configService,
      configPath,
    );
  },
  inject: [ConfigService, loggerService, ...connectionTokens],
});
