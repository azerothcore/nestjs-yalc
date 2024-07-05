import { Module, ModuleMetadata, Type } from '@nestjs/common';
import { YalcUserModule } from './user.module.ts';
import { yalcBaseAppModuleMetadataFactory } from '@nestjs-yalc/app/base-app-module.helper.ts';
import { APP_ALIAS_USER_API } from './user.def.ts';
import { YalcGraphQL } from '@nestjs-yalc/graphql/graphql.module.js';
import { ConfFactory } from './config/config.ts';
import { ___dirname } from '@nestjs-yalc/utils';
import path from 'path';

function createYalcAppUserApiModuleMetadata(module: Type<any>): ModuleMetadata {
  return yalcBaseAppModuleMetadataFactory(module, APP_ALIAS_USER_API, {
    envDir: path.join(___dirname(import.meta.url), '../../../'),
    configFactory: ConfFactory,
    imports: [YalcUserModule, YalcGraphQL],
  });
}

@Module(createYalcAppUserApiModuleMetadata(YalcAppUserApiModule))
export class YalcAppUserApiModule {}
