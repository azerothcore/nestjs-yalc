import {
  expect,
  jest,
  describe,
  it,
  beforeEach,
  beforeAll,
  afterAll,
  afterEach,
} from '@jest/globals';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { DynamicModule, INestApplicationContext, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  curriedExecuteStandaloneFunction,
  executeStandaloneFunction,
} from '../app.helper.js';
import {
  getBootstrappedApps,
  getMainBootstrappedApp,
} from '../app-bootstrap-base.helper.js';
import { AppBootstrap } from '../app-bootstrap.helper.js';
import { yalcBaseAppModuleMetadataFactory } from '../base-app-module.helper.js';
import { EventModule } from '@nestjs-yalc/event-manager/event.module.js';

@Module(
  yalcBaseAppModuleMetadataFactory(TestModule1, 'test1', {
    configFactory: () => ({}),
    logger: true,
  }),
)
class TestModule1 {}

@Module(
  yalcBaseAppModuleMetadataFactory(TestModule2, 'test2', {
    configFactory: () => ({}),
    logger: true,
  }),
)
class TestModule2 {}

@Module(
  yalcBaseAppModuleMetadataFactory(BrokenModule, 'brokenModule', {
    configFactory: () => ({}),
    logger: true,
    providers: [
      {
        provide: 'brokenService',
        useFactory: () => {
          throw new Error('Test');
        },
      },
    ],
  }),
)
class BrokenModule {}

describe('test standalone app functions', () => {
  let mockedModule: DeepMocked<DynamicModule>;
  let mockedServiceFunction: jest.Mock<() => string>;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockedServiceFunction = jest.fn(() => 'Test');

    mockedModule = createMock<DynamicModule>({
      imports: [],
    });

    const mockedCreateApplicationContext = jest.spyOn(
      NestFactory,
      'createApplicationContext',
    );

    mockedCreateApplicationContext.mockImplementation(
      () =>
        createMock<INestApplicationContext>({
          get: mockedServiceFunction,
        }) as any,
    );
  });

  afterEach(() => {
    getBootstrappedApps().forEach((app) => app.closeApp());
    getBootstrappedApps().clear();
  });

  it('should run executeStandaloneFunction', async () => {
    const mockedFunction = jest.fn(async (service: any) => {
      return service;
    });

    await executeStandaloneFunction(
      mockedModule,
      mockedServiceFunction,
      mockedFunction,
      {},
      { closeApp: true },
    );

    expect(mockedFunction).toHaveBeenCalledTimes(1);
  });

  it('should run executeStandaloneFunction without close app', async () => {
    const mockedFunction = jest.fn(async (service: any) => {
      return service;
    });

    await executeStandaloneFunction(
      mockedModule,
      mockedServiceFunction,
      mockedFunction,
      {},
    );

    expect(mockedFunction).toHaveBeenCalledTimes(1);
  });

  it('should run executeStandaloneFunction with class module', async () => {
    const mockedFunction = jest.fn(async (service: any) => {
      return service;
    });

    class TestModule {
      constructor() {}
    }

    await executeStandaloneFunction(
      TestModule,
      mockedServiceFunction,
      mockedFunction,
      {},
    );

    expect(mockedFunction).toHaveBeenCalledTimes(1);
  });

  it('should trigger an error if we bootstrap multiple servers', async () => {
    await new AppBootstrap('test1', TestModule1).initApp();

    let error: any = null;
    try {
      await new AppBootstrap('test2', TestModule2, {}).initApp();
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.log(e);
      error = e;
    }

    await expect(error).not.toBe(null);
  });

  it('should not trigger an error when the first app cannot be initialized because of an error', async () => {
    try {
      await new AppBootstrap('brokenModule', BrokenModule).initApp();
    } catch (e: any) {
      // nothing
    }

    let error: any = null;
    try {
      await new AppBootstrap('test2', TestModule2, {}).initApp();
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.log(e);
      error = e;
    }

    await expect(error).toBe(null);
  });

  it('should not trigger an error if we bootstrap multiple servers with the skip option', async () => {
    await new AppBootstrap('test1', TestModule1, {
      skipMultiServerCheck: true,
    }).initApp();

    let error: any = null;
    try {
      await new AppBootstrap('test2', TestModule2, {
        skipMultiServerCheck: true,
      }).initApp();
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.log(e);
      error = e;
    }

    await expect(error).toBe(null);
  });

  it('should not trigger an error if we bootstrap multiple servers with the env variable', async () => {
    process.env.APP_SKIP_MULTISERVER_CHECK = 'true';

    await new AppBootstrap('test1', TestModule1).initApp();

    let error: any = null;
    try {
      await new AppBootstrap('test2', TestModule2).initApp();
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.log(e);
      error = e;
    }

    await expect(error).toBe(null);
  });

  it('should get the main bootstrapped app', async () => {
    const app = await new AppBootstrap('test1', TestModule1).initApp();

    const mainApp = getMainBootstrappedApp();

    expect(mainApp === app).toBe(true);
  });
});
