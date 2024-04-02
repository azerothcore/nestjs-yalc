import { Module, Type } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { skeletonUserProvidersFactory } from './user.resolver.js';
import { yalcPhoneProviderFactory } from './user-phone.resolver.js';
import { YalcUserEntity } from './user.entity.js';
import { YalcUserPhoneEntity } from './user-phone.entity.js';
import { YalcEventService } from '@nestjs-yalc/event-manager';
import {
  AppConfigService,
  getAppConfigToken,
  getAppEventToken,
} from '@nestjs-yalc/app/app-config.service.js';
import { yalcBaseAppModuleMetadataFactory } from '@nestjs-yalc/app/base-app-module.helper.js';
import { IServiceWithTypeORMConf } from '@nestjs-yalc/app/conf.type.js';
import { TypeORMLogger } from '@nestjs-yalc/logger';
import { APP_ALIAS_USER, TYPEORM_USER_CONNECTION_TOKEN } from './user.def.js';
import { ConfFactory } from './config/config.js';
import path from 'path';
import { ___dirname } from '@nestjs-yalc/utils';

const userModuleBootstrap = (module: Type<any>) => {
  const skeletonPhoneProviders = yalcPhoneProviderFactory(
    TYPEORM_USER_CONNECTION_TOKEN,
  );
  const skeletonUserProviders = skeletonUserProvidersFactory(
    TYPEORM_USER_CONNECTION_TOKEN,
  );

  return yalcBaseAppModuleMetadataFactory(module, APP_ALIAS_USER, {
    envDir: path.join(___dirname(import.meta.url), '../../../'),
    configFactory: ConfFactory,
    imports: [
      TypeOrmModule.forRootAsync({
        name: TYPEORM_USER_CONNECTION_TOKEN,
        imports: [module],
        inject: [
          getAppConfigToken(APP_ALIAS_USER),
          getAppEventToken(APP_ALIAS_USER),
        ],
        useFactory: async (
          configService: AppConfigService<IServiceWithTypeORMConf>,
          eventService: YalcEventService,
        ) => {
          const conf = configService.values;
          return {
            entities: [YalcUserEntity, YalcUserPhoneEntity],
            logger: new TypeORMLogger(eventService),
            name: TYPEORM_USER_CONNECTION_TOKEN,
            ...conf.typeorm,
          };
        },
      }),
      TypeOrmModule.forFeature(
        [YalcUserEntity, YalcUserPhoneEntity],
        TYPEORM_USER_CONNECTION_TOKEN,
      ),
    ],
    providers: [
      ...skeletonPhoneProviders.providers,
      ...skeletonUserProviders.providers,
    ],
  });
};

@Module(userModuleBootstrap(YalcUserModule))
export class YalcUserModule {}
