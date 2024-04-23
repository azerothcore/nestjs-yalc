/* eslint-disable no-console */
import { LogLevel } from '@nestjs/common';
import {
  IImprovedLoggerOptions,
  LoggerAbstractService,
} from './logger-abstract.service.js';
import { maskDataInObject } from './logger.helper.js';


const logOnlyDefined = (...args: any[]) => {
  return args.filter(function( element ) {
    return element !== undefined;
 })
}

export class ConsoleLogger extends LoggerAbstractService {
  constructor(
    context: string,
    logLevels: LogLevel[] | undefined,
    options: IImprovedLoggerOptions = {},
  ) {
    super(
      context,
      logLevels,
      {
        log: (message, options, ...rest) =>
          console.log(...logOnlyDefined(
            `[${options?.context ?? context}]`,
            message,
            maskDataInObject(options?.data, options?.masks, options?.trace),
            options?.config,
            ...rest,
          )),
        error: (message, trace, options, ...rest) =>
          console.error(
            ...logOnlyDefined(
            `[${options?.context ?? context}]`,
            message,
            trace,
            maskDataInObject(options?.data, options?.masks),
            options?.config,
            ...rest,
          )),
        debug: (message, options, ...rest) =>
          console.debug(...logOnlyDefined(
            `[${options?.context ?? context}]`,
            message,
            maskDataInObject(options?.data, options?.masks, options?.trace),
            options?.config,
            ...rest,
          )),
        warn: (message, options, ...rest) =>
          console.warn(...logOnlyDefined(
            `[${options?.context ?? context}]`,
            message,
            maskDataInObject(options?.data, options?.masks, options?.trace),
            options?.config,
            ...rest,
          )),
        verbose: (message, options, ...rest) =>
          console.info(...logOnlyDefined(
            `[${options?.context ?? context}]`,
            message,
            maskDataInObject(options?.data, options?.masks, options?.trace),
            options?.config,
            ...rest,
          )),
      },
      options,
    );
  }
}
