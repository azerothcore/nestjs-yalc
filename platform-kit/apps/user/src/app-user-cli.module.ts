import { APP_EVENT_SERVICE } from '@nestjs-yalc/app/def.const.js';
import {
  DbMigrationServiceFactory,
  DbOpsServiceFactory,
  setGlobalMigrationClasses,
} from '@nestjs-yalc/database';
import { APP_ALIAS_USER_CLI, TYPEORM_USER_CONNECTION_TOKEN } from './user.def';
import { YalcUserModule } from '.';
import { ConfFactory } from './config/config';
import {
  YalcBaseAppModule,
  yalcBaseAppModuleMetadataFactory,
} from '@nestjs-yalc/app/base-app-module.helper.js';
import { Module } from '@nestjs/common';
import YalcUserTypeORMOpsService, {
  YalcUserDBOpsRunnerService,
} from './db-typeorm/user-db-ops.service.js';
import typeOrmMigrationList from './db-typeorm/migration-list.ts';
import { ___dirname } from '@nestjs-yalc/utils';
import path from 'path';

setGlobalMigrationClasses(TYPEORM_USER_CONNECTION_TOKEN, typeOrmMigrationList);

export function yalcUserCliAppModuleMetadata() {
  return yalcBaseAppModuleMetadataFactory(
    YalcUserCliModule,
    APP_ALIAS_USER_CLI,
    {
      envDir: path.join(___dirname(import.meta.url), '../../../'),
      configFactory: ConfFactory,
      imports: [YalcUserModule],
      providers: [
        /**
         * TypeORM
         */
        DbMigrationServiceFactory(APP_EVENT_SERVICE, [
          TYPEORM_USER_CONNECTION_TOKEN,
        ]),
        DbOpsServiceFactory(APP_EVENT_SERVICE, [TYPEORM_USER_CONNECTION_TOKEN]),
        YalcUserTypeORMOpsService,
        YalcUserDBOpsRunnerService,
      ],
    },
  );
}

@Module(yalcUserCliAppModuleMetadata())
export class YalcUserCliModule extends YalcBaseAppModule {}
