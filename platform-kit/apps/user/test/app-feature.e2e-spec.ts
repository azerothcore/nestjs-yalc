import { Test, TestingModule } from '@nestjs/testing';
import { YalcAppUserApiModule } from '../src/app-user-api.module.ts';
import { initTestingApp } from '@nestjs-yalc/jest/jest.helper.js';
import { AppBootstrap } from '@nestjs-yalc/app/app-bootstrap.helper.js';
import { APP_ALIAS_USER_API } from '../src/user.def.ts';
import { runQuery } from '@nestjs-yalc/jest/config/jest-conf.helpers.js';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { afterEach } from 'node:test';

describe('User app (feature test)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const appBootstrap = new AppBootstrap(
      APP_ALIAS_USER_API,
      YalcAppUserApiModule,
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [appBootstrap.getModule()],
    }).compile();

    app = await initTestingApp(moduleFixture, appBootstrap);
  });

  afterEach(async () => {
    await app.close();
  });

  it('should get the empty user list', async () => {
    const queryName = 'SkeletonModule_getYalcUserEntityGrid';
    const query = `
        query {
          SkeletonModule_getYalcUserEntityGrid(filters: {
            expressions: {
              text:{
                type: CONTAINS,
                field:lastName,
                filter:""
              }
            }
          }) {
            nodes {
              firstName
              lastName
            }
          }
        }
    `;

    await runQuery({
      app,
      query,
      queryName,
      callback: (body) => {
        expect(body).toEqual({
          data: { SkeletonModule_getYalcUserEntityGrid: { nodes: [] } },
        });
      },
    });
  });
});
