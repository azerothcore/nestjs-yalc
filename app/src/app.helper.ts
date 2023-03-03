import { ClassType } from '@nestjs-yalc/types/globals.d.js';
import { DynamicModule, INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import lodash from 'lodash';
const { curry } = lodash;

export const executeStandaloneFunctionForApp = async (
  app: INestApplicationContext,
  serviceType: any,
  fn: { (service: any): Promise<any> },
): Promise<void> => {
  await app.init();

  const service = app.get(serviceType);

  await fn(service).finally(() => app.close());
};

/**
 * Curried version of the executeStandaloneFunctionForApp to memoize the app
 * Use it when you need to run the executeStandaloneFunction multiple time
 * @see https://lodash.com/docs/#curry
 * @param module
 * @returns
 */
export const curriedExecuteStandaloneFunction = async (module: DynamicModule) =>
  curry(executeStandaloneFunctionForApp)(
    await NestFactory.createApplicationContext(module),
  );

/**
 *
 * @param module
 * @param serviceType
 * @param fn
 * @returns
 */
export const executeStandaloneFunction = async <TService>(
  module: DynamicModule,
  serviceType: ClassType<TService>,
  fn: { (service: TService): Promise<any> },
) => {
  return (await curriedExecuteStandaloneFunction(module))(serviceType, fn);
};