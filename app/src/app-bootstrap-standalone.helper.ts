import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
// import { GqlExceptionFilter } from '@nestjs/graphql';
import { FastifyInstance } from 'fastify';
import { envIsTrue } from '@nestjs-yalc/utils/env.helper.js';
import clc from 'cli-color';
import { BaseAppBootstrap } from './app-bootstrap-base.helper.js';

export class StandaloneAppBootstrap extends BaseAppBootstrap<INestApplicationContext> {
  constructor(appAlias: string, readonly module: any) {
    super(appAlias, module);
  }

  async initApp(options?: {
    globalsOptions?: unknown;
    fastifyInstance?: FastifyInstance;
  }) {
    await this.createApp({
      globalsOptions: options?.globalsOptions,
    });

    await this.applyBootstrapGlobals(options?.globalsOptions);

    await this.getApp().init();

    if (envIsTrue(process.env.APP_DRY_RUN) === true) {
      this.loggerService?.log('Dry run, exiting...');
      await this.getApp().close;
      process.exit(0);
    }

    return this;
  }

  async createApp(_options?: {
    globalsOptions?: unknown;
    fastifyInstance?: FastifyInstance;
  }) {
    let app: INestApplicationContext;
    try {
      app = await NestFactory.createApplicationContext(this.module);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(clc.red('Failed to create app'), clc.red(err));
      throw new Error('Process aborted');
    }

    return this.setApp(app);
  }
}
