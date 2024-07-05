import { AppConfigService } from '@nestjs-yalc/app/app-config.service.js';
import { APP_EVENT_SERVICE } from '@nestjs-yalc/app/def.const.js';
import { Injectable, Inject } from '@nestjs/common';
import { DbOpsService } from './index.ts';
import { addEnvPayloadForMigrationOptions } from './db-fp.lib.ts';
import { DbMigrateService, MigrationOptions } from './db-migrate.service.ts';
import { IServiceWithTypeORMConf } from '@nestjs-yalc/app/conf.type.js';
import { YalcEventService } from '@nestjs-yalc/event-manager';

interface _IDbOpsBase {
  create(): Promise<void>;

  drop(): Promise<void>;

  seed(): Promise<void>;
}

export interface IDbService extends _IDbOpsBase {
  migrate(options: MigrationOptions): Promise<void>;
}

export interface IDbRunnerService extends _IDbOpsBase {
  /**
   *
   * @param options - The array should be in the order of the injected classes in the constructor
   */
  migrate(options: MigrationOptions[]): Promise<void>;
}

@Injectable()
export class YalcDbService implements IDbService {
  constructor(
    @Inject(APP_EVENT_SERVICE)
    protected readonly event: YalcEventService,
    protected readonly dbMigrateService: DbMigrateService,
    protected readonly dbOpsService: DbOpsService,
    protected readonly configService: AppConfigService<IServiceWithTypeORMConf>,
  ) {}

  public async migrate(options: MigrationOptions) {
    await this.dbMigrateService.migrate(
      addEnvPayloadForMigrationOptions(this.configService, options),
    );
  }

  public async create() {
    await this.dbOpsService.create();
  }

  public async drop() {
    await this.dbOpsService.drop();
  }

  public async seed() {
    this.event.warn('Seed not implemented');
  }
}

export class YalcDbRunnerService implements IDbRunnerService {
  constructor(protected dbServices: IDbService[]) {}

  /**
   *
   * @param options - The array should be in the order of the injected classes in the constructor
   */
  async migrate(options: MigrationOptions[]): Promise<void> {
    let i = 0;
    for (const dbService of this.dbServices) {
      await dbService.migrate(options[i]);
      i++;
    }

    return;
  }

  async create(): Promise<void> {
    for (const dbService of this.dbServices) {
      await dbService.create();
    }

    return;
  }

  async drop(): Promise<void> {
    for (const dbService of this.dbServices) {
      await dbService.drop();
    }

    return;
  }

  async seed(): Promise<void> {
    for (const dbService of this.dbServices) {
      await dbService.seed();
    }

    return;
  }
}
