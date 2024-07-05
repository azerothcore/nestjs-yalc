import {
  DynamicModule,
  INestApplicationContext,
  Logger,
  LoggerService,
  Type,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import { GqlExceptionFilter } from '@nestjs/graphql';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { IServiceConf } from './conf.type.js';
import { SYSTEM_LOGGER_SERVICE } from './def.const.js';
import { YalcDefaultAppModule } from './base-app-module.helper.js';
import { ICreateOptions, INestCreateOptions } from './app-bootstrap.helper.js';
import { EventModule } from '@nestjs-yalc/event-manager/event.module.js';
import { LoggerServiceFactory } from '@nestjs-yalc/logger/logger.service.js';
import { FastifyInstance } from 'fastify';
import { getEnvLoggerLevels } from '@nestjs-yalc/logger/logger.helper.js';
import { globalPromiseTracker } from '@nestjs-yalc/utils/promise.helper.js';

/**
 * Side effect to be executed as soon as the module is imported
 */
Logger.overrideLogger(getEnvLoggerLevels());

export interface IGlobalOptions {
  extraImports?: NonNullable<DynamicModule['imports']>;
  eventModuleClass?: typeof EventModule;
  logger?: typeof LoggerServiceFactory;

  /**
   * This is used to avoid bootstrapping a multi-server app
   */
  skipMultiServerCheck?: boolean;
}

const bootstrappedApps: Set<any> = new Set();

export const getBootstrappedApps = () => {
  return bootstrappedApps;
};

export const getMainBootstrappedApp = <
  TApp extends BaseAppBootstrap<
    NestFastifyApplication | INestApplicationContext
  >,
>(): TApp | null => {
  if (getBootstrappedApps().size === 0) {
    return null;
  }

  return getBootstrappedApps().entries().next().value;
};

export abstract class BaseAppBootstrap<
  TAppType extends NestFastifyApplication | INestApplicationContext,
> {
  protected app?: TAppType;
  protected loggerService!: LoggerService;
  protected module: Type<any> | DynamicModule;
  private isClosed = false;

  constructor(
    protected appAlias: string,
    protected readonly appModule: Type<any>,
    options?: { globalsOptions?: IGlobalOptions },
  ) {
    this.module = YalcDefaultAppModule.forRoot(
      this.appAlias,
      [appModule, ...(options?.globalsOptions?.extraImports ?? [])],
      options?.globalsOptions,
    );

    const bootstrappedApp = getMainBootstrappedApp();

    if (bootstrappedApp && !options?.globalsOptions?.skipMultiServerCheck) {
      throw new Error(
        'You are trying to bootstrap multiple servers in the same process. This is not allowed. Use a different process for each server',
      );
    }

    getBootstrappedApps().add(this);
  }

  async initApp(options?: {
    createOptions?: INestCreateOptions;
    fastifyInstance?: FastifyInstance;
  }): Promise<this> {
    options; // extend this method in the child class
    return this;
  }

  setApp(app: TAppType) {
    this.app = app;

    /**
     * Monkey patch the close method to set the isClosed flag
     */
    const originalCloseFn = this.app.close.bind(this.app);
    this.app.close = async () => {
      this.isClosed = true;
      const closeRes = await originalCloseFn();
      getBootstrappedApps().delete(this);
      return closeRes;
    };

    /**
     * Monkey patch the init method to set the isClosed flag
     */
    const originalInitFn = this.app.init.bind(this.app);
    this.app.init = async () => {
      this.isClosed = false;
      getBootstrappedApps().add(this);
      return originalInitFn();
    };

    return this;
  }

  isAppClosed() {
    return this.isClosed;
  }

  getAppAlias() {
    return this.appAlias;
  }

  getConf() {
    const configService = this.getApp().get<ConfigService>(ConfigService);
    return configService.get<IServiceConf>(this.appAlias);
  }

  getApp() {
    if (!this.app) {
      throw new Error('This app is not initialized yet');
    }

    return this.app;
  }

  async closeApp() {
    await this.cleanup();

    await this.app?.close();

    getBootstrappedApps().delete(this);
    this.isClosed = true;
  }

  async cleanup() {
    /**
     * When running behind a lambda, we have to await for all the promises that have been added to the global promise tracker
     * to avoid them being killed by the lambda
     * @see - https://stackoverflow.com/questions/64688812/running-tasks-in-aws-lambda-background
     */
    await globalPromiseTracker.waitForAll();
  }

  /**
   *
   * @returns The main module of the business logic (the one that is passed in the constructor)
   */
  getAppModule() {
    return this.appModule;
  }

  /**
   *
   * @returns The global module that is used to bootstrap the app (YalcDefaultAppModule)
   */
  getModule() {
    return this.module;
  }

  async applyBootstrapGlobals(_options?: ICreateOptions) {
    this.loggerService = this.getApp().get(SYSTEM_LOGGER_SERVICE);
    this.loggerService.debug?.('Setting logger service...');
    this.getApp().useLogger(this.loggerService);
    Logger.overrideLogger(this.loggerService);
    return this;
  }
}
