import { AppLoggerFactory } from '@nestjs-yalc/logger';
import { FactoryProvider, LogLevel } from '@nestjs/common';
import type {
  IImprovedLoggerOptions,
  ImprovedLoggerService,
} from '@nestjs-yalc/logger/logger-abstract.service.js';
import { IServiceConf } from '@nestjs-yalc/app/conf.type.js';
import {
  AppConfigService,
  getAppConfigToken,
} from '@nestjs-yalc/app/app-config.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';

export const LoggerServiceFactory = (
  appAlias: string,
  provide: string,
  context: string,
  options: IImprovedLoggerOptions = {},
): FactoryProvider<ImprovedLoggerService> => ({
  provide: provide,
  useFactory: (
    eventEmitter: EventEmitter2,
    config?: AppConfigService<IServiceConf>,
  ): ImprovedLoggerService => {
    const conf = config?.values;
    const loggerType = conf?.loggerType;
    const loggerLevels: LogLevel[] =
      options.overrideLoggerLevels ??
      (conf?.logContextLevels?.[context] || conf?.logLevels || []);

    return AppLoggerFactory(context, loggerLevels, loggerType, {
      event:
        options.event !== false
          ? {
              eventEmitter: options.event?.eventEmitter ?? eventEmitter,
            }
          : false,
    });
  },
  inject: [
    EventEmitter2,
    { token: getAppConfigToken(appAlias), optional: true },
  ],
});
