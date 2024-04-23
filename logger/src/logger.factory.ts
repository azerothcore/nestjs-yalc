import { ConsoleLogger } from './logger-console.service.js';
import { PinoLogger } from './logger-pino.service.js';
import { LogLevel } from '@nestjs/common';
import { LoggerTypeEnum, LOG_LEVEL_DEFAULT } from './logger.enum.js';
import { ImprovedNestLogger } from './logger-nest.service.js';
import type {
  IImprovedLoggerOptions,
  ImprovedLoggerService,
} from './logger-abstract.service.js';
import _ from 'lodash';

export const AppLoggerFactory = _.memoize(
  (
    context: string,
    loggerLevels: LogLevel[] = LOG_LEVEL_DEFAULT,
    loggerType?: string,
    options?: IImprovedLoggerOptions,
  ): ImprovedLoggerService => {
    let logger: ImprovedLoggerService;
    switch (loggerType) {
      case LoggerTypeEnum.CONSOLE:
        logger = new ConsoleLogger(context, loggerLevels, options);
        break;
      case LoggerTypeEnum.PINO:
        logger = new PinoLogger(context, loggerLevels, options);
        break;
      case LoggerTypeEnum.NEST:
      default:
        logger = new ImprovedNestLogger(
          context,
          {
            timestamp: true,
          },
          options,
        );
        // not available on default NEST logger
        // ImprovedNestLogger.overrideLogger(loggerLevels);
        logger.setLogLevels?.(loggerLevels);
        break;
    }

    logger.debug?.(
      `Use Logger: ${
        loggerType ??
        `not specified, fallback to default (${LoggerTypeEnum.NEST})`
      }`,
    );

    return logger;
  },
  (context, loggerLevels, loggerType, options) =>
    `${context}-${loggerLevels?.join('-')}-${loggerType}-${options}`,
);
