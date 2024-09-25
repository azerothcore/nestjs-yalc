import { DefaultError } from '@nestjs-yalc/errors/default.error.js';
import { LogLevelEnum } from '@nestjs-yalc/logger/logger.enum.js';
import { isClass } from '@nestjs-yalc/utils/class.helper.js';
import { HttpStatus } from '@nestjs/common';
import { LogLevel } from 'typeorm';
import { IErrorEventOptions } from './event.js';

export function getLogLevelByStatus(statusCode: number) {
  let loggerLevel: LogLevel;
  switch (true) {
    case statusCode >= HttpStatus.INTERNAL_SERVER_ERROR:
      loggerLevel = LogLevelEnum.ERROR;
      break;
    case statusCode === HttpStatus.TOO_MANY_REQUESTS:
      loggerLevel = LogLevelEnum.WARN;
      break;
    case statusCode >= HttpStatus.BAD_REQUEST:
    default:
      loggerLevel = LogLevelEnum.LOG;
      break;
  }

  return loggerLevel;
}

export function isErrorEvent(options: IErrorEventOptions) {
  if (!options.errorClass) {
    return false;
  }

  return (
    options.errorClass === true ||
    isClass(options.errorClass, DefaultError.name) ||
    (!isClass(options.errorClass) &&
      options.errorClass.getStatus &&
      getLogLevelByStatus(options.errorClass.getStatus()) ===
        LogLevelEnum.ERROR)
  );
}
