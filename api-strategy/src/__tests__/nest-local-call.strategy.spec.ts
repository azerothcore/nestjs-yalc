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
import { createMock, DeepMocked, PartialFuncReturn } from '@golevelup/ts-jest';
import { HttpAdapterHost } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { InjectOptions } from 'fastify';
import {
  NestLocalCallStrategy,
  NestLocalCallStrategyProvider,
} from '../strategies/nest-local-call.strategy.js';
import { YalcGlobalClsService } from '../../../app/src/cls.module.js';

describe('NestLocalCallStrategy', () => {
  let adapterHost: HttpAdapterHost;
  let clsService: DeepMocked<YalcGlobalClsService>;

  beforeEach(() => {
    adapterHost = createMock<HttpAdapterHost>({
      httpAdapter: {
        getInstance: () =>
          createMock<FastifyAdapter>({
            inject: (
              _opts: string | InjectOptions,
            ): PartialFuncReturn<Promise<any>> =>
              ({
                body: '{}',
                json: () => ({}),
              } as any),
          }),
      },
    });

    clsService = createMock<YalcGlobalClsService>();
  });

  it('should be defined', () => {
    expect(NestLocalCallStrategy).toBeDefined();
  });

  it('should be instantiable', () => {
    const instance = new NestLocalCallStrategy(adapterHost, clsService);
    expect(instance).toBeDefined();
  });

  it('should be able to execute the call method', async () => {
    const instance = new NestLocalCallStrategy(adapterHost, clsService);
    const result = await instance.call('http://localhost:3000', {
      method: 'GET',
    });
    expect(result).toBeDefined();
  });

  it('should be able to execute the get method', async () => {
    const instance = new NestLocalCallStrategy(adapterHost, clsService);
    const result = await instance.get('http://localhost:3000');
    expect(result).toBeDefined();
  });

  it('should be able to execute the post method', async () => {
    const instance = new NestLocalCallStrategy(adapterHost, clsService);
    const result = await instance.post('http://localhost:3000', {});
    expect(result).toBeDefined();
  });

  it('should create a provider', () => {
    const provider = NestLocalCallStrategyProvider('test');
    expect(provider).toBeDefined();
  });

  it('should create a provider and execute the useFactory method', () => {
    const provider = NestLocalCallStrategyProvider('test');
    expect(provider.useFactory(adapterHost, clsService)).toBeDefined();
  });

  it('should be able to execute the call method with parameters', async () => {
    const instance = new NestLocalCallStrategy(adapterHost, clsService);
    const result = await instance.call('http://localhost:3000', {
      method: 'GET',
      parameters: {
        test1: { test: 'test' },
      },
    });
    expect(result).toBeDefined();
  });

  it('should skip parsing json if shouldSkipJsonParse is true', async () => {
    const instance = new NestLocalCallStrategy(
      adapterHost,
      clsService,
      // @ts-expect-error isnt needed for test
      {},
      '',
      {
        shouldSkipJsonParse: (body) => true,
      },
    );
    expect(instance).toBeDefined();

    const result = await instance.call('http://localhost:3000', {
      method: 'GET',
    });

    expect(result.data).toEqual('{}');
  });

  it('should parse json if shouldSkipJsonParse is false', async () => {
    const instance = new NestLocalCallStrategy(
      adapterHost,
      clsService,
      // @ts-expect-error isnt needed for test
      {},
      '',
      {
        shouldSkipJsonParse: (body) => false,
      },
    );
    expect(instance).toBeDefined();

    const result = await instance.call('http://localhost:3000', {
      method: 'GET',
    });

    expect(result.data).toMatchObject({});
  });

  it('should parse json if shouldSkipJsonParse is undefined', async () => {
    const instance = new NestLocalCallStrategy(adapterHost, clsService);
    expect(instance).toBeDefined();

    const result = await instance.call('http://localhost:3000', {
      method: 'GET',
    });

    expect(result.data).toMatchObject({});
  });
});
