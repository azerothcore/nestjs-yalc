import { envToArray } from '@nestjs-yalc/utils/env.helper.js';
import { LogLevel } from '@nestjs/common';
import fastRedact from 'fast-redact';
import lodash from 'lodash';
import { LOG_LEVEL_ALL, LoggerDefContext } from './logger.enum.js';
const { isEmpty } = lodash;

export function maskDataInObject(data?: any, paths?: string[], trace?: any) {
  if (typeof data === 'string') data = { message: data };

  if (!paths || !data || isEmpty(paths) || isEmpty(data)) {
    if (trace) data ? (data.trace = trace) : (data = { trace });

    return data;
  }

  const redact = fastRedact({
    paths,
  });

  return { ...JSON.parse(redact(data)), trace };
}

export const getEnvLoggerLevels = (
  context?: string,
  def: LogLevel[] = LOG_LEVEL_ALL,
): LogLevel[] => {
  let levels = envToArray<LogLevel>(
    `NEST_LOGGER_LEVELS_${(
      context ?? LoggerDefContext.NEST_SYSTEM
    ).toUpperCase()}`,
  );

  if (!levels.length) levels = envToArray<LogLevel>('NEST_LOGGER_LEVELS');

  return levels.length ? levels : def;
};
