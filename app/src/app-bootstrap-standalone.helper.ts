import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
// import { GqlExceptionFilter } from '@nestjs/graphql';
import { FastifyInstance } from 'fastify';
import { envIsTrue } from '@nestjs-yalc/utils/env.helper.js';
import clc from 'cli-color';
import {
  BaseAppBootstrap,
  IGlobalOptions,
} from './app-bootstrap-base.helper.js';
import { INestCreateOptions } from './app-bootstrap.helper.js';
import { getEnvLoggerLevels } from '@nestjs-yalc/logger/logger.helper.js';

export class StandaloneAppBootstrap<
  TGlobalOptions extends IGlobalOptions = IGlobalOptions,
> extends BaseAppBootstrap<INestApplicationContext> {
  constructor(appAlias: string, module: any, options?: TGlobalOptions) {
    super(appAlias, module, { globalsOptions: options });
  }

  async initApp(options?: {
    createOptions?: INestCreateOptions;
    fastifyInstance?: FastifyInstance;
  }) {
    await this.createApp({
      createOptions: options?.createOptions,
    });

    await this.applyBootstrapGlobals(options?.createOptions);

    await this.getApp().init();

    if (envIsTrue(process.env.APP_DRY_RUN) === true) {
      this.loggerService?.log('Dry run, exiting...');
      await this.getApp().close();
      process.exit(0);
    }

    return this;
  }

  async createApp(_options?: {
    createOptions?: INestCreateOptions;
    fastifyInstance?: FastifyInstance;
  }) {
    let app: INestApplicationContext;
    try {
      app = await NestFactory.createApplicationContext(this.module, {
        logger: getEnvLoggerLevels(),
      });
    } catch (err) {
      this.closeCleanup();
      // eslint-disable-next-line no-console
      console.error(clc.red('Failed to create app'), clc.red(err));
      throw new Error('Process aborted');
    }

    return this.setApp(app);
  }
}
