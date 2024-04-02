/**
 * TypeORM operation service
 */

import { AppConfigService } from '@nestjs-yalc/app/app-config.service.js';
import { APP_EVENT_SERVICE } from '@nestjs-yalc/app/def.const.js';
import { DbMigrateService, DbOpsService } from '@nestjs-yalc/database';
import { YalcEventService } from '@nestjs-yalc/event-manager';
import { Inject, Injectable } from '@nestjs/common';

import {
  YalcDbRunnerService,
  YalcDbService,
} from '@nestjs-yalc/database/db-cli.helper.ts';

@Injectable()
export default class YalcUserTypeORMOpsService extends YalcDbService {
  constructor(
    @Inject(APP_EVENT_SERVICE)
    protected readonly appEventService: YalcEventService,
    protected readonly dbMigrateService: DbMigrateService,
    protected readonly dbOpsService: DbOpsService,
    protected readonly configService: AppConfigService,
  ) {
    super(appEventService, dbMigrateService, dbOpsService, configService);
  }
}

/**
 * Database operation runner service
 */
@Injectable()
export class YalcUserDBOpsRunnerService extends YalcDbRunnerService {
  constructor(
    @Inject(YalcUserTypeORMOpsService)
    protected readonly typeOrmService: YalcUserTypeORMOpsService,
  ) {
    super([typeOrmService]);
  }
}
