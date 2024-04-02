import type { LogLevel } from '@nestjs/common';
import type { LoggerTypeEnum } from '@nestjs-yalc/logger/logger.enum.js';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { MigrationSelection } from '@nestjs-yalc/database';

export type TServiceConf = {
  appName: string;
  loggerType: LoggerTypeEnum | string;
  logLevels: LogLevel[];
  /** You can specialize log levels per each logger context. By default logLevels is used instead */
  logContextLevels?: { [key: string]: LogLevel[] };
  domain?: string;

  host: string;
  port: number;
  isDev: boolean;
  isTest: boolean;
  isPipeline: boolean;
  isProduction: boolean;
  env: typeof process.env.NODE_ENV;
  apiPrefix?: string;
  basePath?: string;
  operationPrefix?: string;
};

export interface IServiceConf extends TServiceConf {}

export interface IServiceWithTypeORMConf extends IServiceConf {
  typeorm: TypeOrmModuleOptions;
  migrationPayload?: MigrationSelection;
}

export interface IConfFactoryOptions {
  appName: string;
  /** You can specialize log levels per each logger context. By default logLevels is used instead */
  logContextLevels?: string[];
}

export interface IConfWithTypeORMFactoryOptions extends IConfFactoryOptions {
  typeorm: TypeOrmModuleOptions;
}
