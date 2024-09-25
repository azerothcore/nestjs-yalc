import { DefaultError } from '@nestjs-yalc/errors/default.error.js';
import { LogLevelEnum } from '@nestjs-yalc/logger/logger.enum.js';
import { isClass } from '@nestjs-yalc/utils/class.helper.js';
import { HttpStatus } from '@nestjs/common';
import { LogLevel } from 'typeorm';
import { IErrorEventOptions } from './event.js';
import { getStatusCodeFromError } from '@nestjs-yalc/utils/http.helper.js';

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

/**
 * Check if the event will trigger an error log
 */
export function isErrorEvent(options: IErrorEventOptions) {
  if (
    typeof options.logger === 'object' &&
    options.logger.level === LogLevelEnum.ERROR
  ) {
    return true;
  }

  if (!options.errorClass) {
    return false;
  }

  if (options.errorClass === true) {
    return true;
  }

  if (isClass(options.errorClass, DefaultError.name)) {
    return true;
  }

  const statusCode = getStatusCodeFromError(options.errorClass);
  if (statusCode) {
    return getLogLevelByStatus(statusCode) === LogLevelEnum.ERROR;
  }

  /**
   * This is a fallback to handle edge cases but it's slower since
   * it creates an instance of the error class and should not happen
   */
  let error;
  if (isClass(options.errorClass)) {
    error = new options.errorClass();
  } else {
    error = options.errorClass;
  }

  return (
    !error.getStatus ||
    getLogLevelByStatus(error.getStatus()) === LogLevelEnum.ERROR
  );
}
