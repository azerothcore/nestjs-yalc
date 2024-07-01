import { Test, TestingModule } from '@nestjs/testing';
import {
  YALC_ALIAS_PLATFORM,
  YalcPlatformAppModule,
} from '../src/platform.module.ts';
import { initTestingApp } from '@nestjs-yalc/jest/jest.helper.js';
import { AppBootstrap } from '@nestjs-yalc/app/app-bootstrap.helper.js';
import { runQuery } from '@nestjs-yalc/jest/config/jest-conf.helpers.js';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { afterEach } from 'node:test';

describe('Platform app (integration test)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const appBootstrap = new AppBootstrap(
      YALC_ALIAS_PLATFORM,
      YalcPlatformAppModule,
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [appBootstrap.getModule()],
    }).compile();

    app = await initTestingApp(moduleFixture, appBootstrap);
  });

  afterEach(async () => {
    await app.close();
  });

  it('should be defined', async () => {
    expect(app).toBeDefined();
  });
});
