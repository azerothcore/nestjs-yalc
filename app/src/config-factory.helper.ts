import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import {
  IConfFactoryOptions,
  IConfWithTypeORMFactoryOptions,
  IServiceConf,
  IServiceWithTypeORMConf,
} from './conf.type.ts';
import { LogLevel } from '@nestjs/common';
import { envIsTrue, envToArray } from '@nestjs-yalc/utils';
import { LOG_LEVEL_DEFAULT, LoggerTypeEnum } from '@nestjs-yalc/logger';

export const getEnvByAliasPrefix = (alias: string, value: string): string => {
  return (
    process.env[`APP_${alias.toUpperCase()}_${value}`] ||
    process.env[value] ||
    ''
  );
};

export const yalcBaseConfigFactory = (
  options: IConfFactoryOptions,
): IServiceConf => {
  // comma separated list of logger levels from NEST_LOGGER_LEVELS env
  const logLevelsFromEnv: LogLevel[] =
    envToArray<LogLevel>('NEST_LOGGER_LEVELS');

  const logLevels: LogLevel[] = logLevelsFromEnv.length
    ? logLevelsFromEnv
    : LOG_LEVEL_DEFAULT;

  const port = getEnvByAliasPrefix(options.appName, 'PORT');

  return {
    isDev: process.env.NODE_ENV === 'development',
    isTest: process.env.NODE_ENV === 'test',
    isPipeline: process.env.NODE_ENV === 'pipeline',
    isProduction: process.env.NODE_ENV === 'production',
    env: process.env.NODE_ENV || 'development',
    loggerType: process.env.NEST_LOGGER || LoggerTypeEnum.NEST,
    logLevels,
    appName: options.appName,
    apiPrefix: process.env.NEST_API_PREFIX || '',
    port: port ? parseInt(port) : 0,
    domain: process.env.DOMAIN || 'localhost',
    basePath: process.env.BASE_PATH || '',
    host: process.env.HOST || 'localhost',
    operationPrefix: process.env.OPERATION_PREFIX || '',
  };
};

export const yalcBaseConfigFactoryWithTypeOrm = (
  options: IConfWithTypeORMFactoryOptions,
): IServiceWithTypeORMConf => {
  return {
    ...yalcBaseConfigFactory(options),
    typeorm: yalcTypeOrmConfigFactory(options.typeorm),
  };
};

export const yalcTypeOrmConfigFactory = (
  options: TypeOrmModuleOptions,
): TypeOrmModuleOptions => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { port, host, username, password, ...restOptions } = options as any;
  return {
    port: parseInt(process.env.TYPEORM_PORT ?? '', 10),
    host: process.env.TYPEORM_HOST,
    username: process.env.TYPEORM_USERNAME,
    password: process.env.TYPEORM_PASSWORD,
    manualInitialization: envIsTrue(process.env.TYPEORM_NO_SEL_DB),
    ...restOptions,
  };
};
