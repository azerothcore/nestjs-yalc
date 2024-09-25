import { LogLevelEnum } from '@nestjs-yalc/logger/logger.enum.js';
import { isClass } from '@nestjs-yalc/utils/class.helper.js';
import { HttpException, HttpStatus } from '@nestjs/common';
import { LogLevel } from 'typeorm';
import { IErrorEventOptions } from './event.js';
import { getStatusCodeFromError } from '@nestjs-yalc/errors/error.helper.js';

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

export function getLogLevelByError(error: any) {
  const statusCode = getStatusCodeFromError(error);
  if (statusCode) {
    return getLogLevelByStatus(statusCode);
  }

  /**
   * This is a fallback to handle edge cases but it's slower since
   * it creates an instance of the error class and should not happen
   */
  let _error: Error;
  if (isClass(error)) {
    _error = new error() as any;
  } else {
    _error = error;
  }

  const httpException = _error as HttpException;
  if (httpException.getStatus)
    return getLogLevelByStatus(httpException.getStatus());

  return _error.stack ? LogLevelEnum.ERROR : LogLevelEnum.LOG;
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

  const logLevel = getLogLevelByError(options.errorClass);
  return logLevel === LogLevelEnum.ERROR;
}
