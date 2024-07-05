import { Module, ModuleMetadata, Type } from '@nestjs/common';
import { yalcBaseAppModuleMetadataFactory } from '@nestjs-yalc/app/base-app-module.helper.ts';
import { YalcAppUserApiModule } from '@nestjs-yalc/pk-app-user/app-user-api.module.ts';
import { ConfFactory } from './config/config.ts';
import path from 'path';
import { ___dirname } from '@nestjs-yalc/utils';

export const YALC_ALIAS_PLATFORM = 'yalc-platform';

function createYalcPlatformAppMetadata(module: Type<any>): ModuleMetadata {
  return yalcBaseAppModuleMetadataFactory(module, YALC_ALIAS_PLATFORM, {
    configFactory: ConfFactory,
    envDir: path.join(___dirname(import.meta.url), '../../../../'),
    imports: [YalcAppUserApiModule],
  });
}

@Module(createYalcPlatformAppMetadata(YalcPlatformAppModule))
export class YalcPlatformAppModule {}
