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
import { DynamicModule, INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  curriedExecuteStandaloneFunction,
  executeStandaloneFunction,
} from '../app.helper.js';
import { getBootstrappedApps } from '../app-bootstrap-base.helper.js';
import { AppBootstrap } from '../app-bootstrap.helper.js';

describe('test standalone app functions', () => {
  let mockedModule: DeepMocked<DynamicModule>;
  let mockedServiceFunction: jest.Mock<() => string>;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockedServiceFunction = jest.fn(() => 'Test');

    mockedModule = createMock<DynamicModule>({});

    const mockedCreateApplicationContext = jest.spyOn(
      NestFactory,
      'createApplicationContext',
    );

    getBootstrappedApps().shift();

    mockedCreateApplicationContext.mockImplementation(
      () =>
        createMock<INestApplicationContext>({
          get: mockedServiceFunction,
        }) as any,
    );
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
    new AppBootstrap('test', mockedModule);

    await expect(() => new AppBootstrap('test2', mockedModule)).toThrowError();
  });

  it('should not trigger an error if we bootstrap multiple servers with the skip option', async () => {
    new AppBootstrap('test', mockedModule, { skipMultiServerCheck: true });

    await expect(
      () =>
        new AppBootstrap('test2', mockedModule, { skipMultiServerCheck: true }),
    ).not.toThrowError();
  });
});
