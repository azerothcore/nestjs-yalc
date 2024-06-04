export enum LogLevelEnum {
  LOG = 'log',
  ERROR = 'error',
  WARN = 'warn',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}

export const LOG_LEVEL_DEFAULT = [
  LogLevelEnum.DEBUG,
  LogLevelEnum.ERROR,
  LogLevelEnum.LOG,
  LogLevelEnum.WARN,
];

export const LOG_LEVEL_ALL = [
  LogLevelEnum.DEBUG,
  LogLevelEnum.ERROR,
  LogLevelEnum.LOG,
  LogLevelEnum.VERBOSE,
  LogLevelEnum.WARN,
];

export enum LoggerTypeEnum {
  CONSOLE = 'console',
  PINO = 'pino',
  NEST = 'nest-logger',
}

export enum LoggerDefContext {
  NEST_SYSTEM = 'system',
}
