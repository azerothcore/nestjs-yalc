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

import { mockNestJSGraphql } from '@nestjs-yalc/jest';
await mockNestJSGraphql(import.meta);

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { CrudGenRepository } from '@nestjs-yalc/crud-gen/crud-gen.repository.js';
import { GQLDataLoader } from '@nestjs-yalc/data-loader/dataloader.helper.js';
import { ModuleRef } from '@nestjs/core';
import 'reflect-metadata';
import { type SkeletonUser } from '../user.entity.js';
import { type SkeletonUserService } from '../user.service.js';

const { skeletonUserServiceFactory } = await import('../user.service.js');
const { lowerCaseEmailMiddleware, SkeletonUserResolver } = await import(
  '../index.js'
);

describe('Test skeleton user resolver', () => {
  let mockedRepository: DeepMocked<CrudGenRepository<SkeletonUser>>;
  let mockedDataloader: DeepMocked<GQLDataLoader<SkeletonUser>>;
  let mockedModuleRef: DeepMocked<ModuleRef>;
  let userService: SkeletonUserService;

  beforeEach(() => {
    mockedRepository = createMock<CrudGenRepository<SkeletonUser>>();
    mockedDataloader = createMock<GQLDataLoader<SkeletonUser>>();
    mockedModuleRef = createMock<ModuleRef>();
    const serviceFactory = skeletonUserServiceFactory('test');
    userService = new serviceFactory(mockedRepository);
  });

  it('should create the resolver', () => {
    const resolver = new SkeletonUserResolver(
      userService,
      mockedDataloader,
      mockedModuleRef,
    );

    expect(resolver).toBeDefined();
  });

  it('should have working methods', () => {
    const resolver = new SkeletonUserResolver(
      userService,
      mockedDataloader,
      mockedModuleRef,
    );

    const randomPass = resolver.SkeletonModule_generateRandomPassword('TEST');

    expect(randomPass).toBeDefined();
  });

  it('should execute the middleware', () => {
    const input: any = { email: 'TEST@TEST.COM' };

    lowerCaseEmailMiddleware({} as any, input, true);

    expect(input).toEqual({ email: 'test@test.com' });
  });
});
