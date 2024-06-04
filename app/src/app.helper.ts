import { ClassType } from '@nestjs-yalc/types/globals.d.js';
import { DynamicModule, INestApplicationContext, Type } from '@nestjs/common';
import { StandaloneAppBootstrap } from './app-bootstrap-standalone.helper.js';
import lodash from 'lodash';
import { AppBootstrap } from './app-bootstrap.helper.js';
import { IGlobalOptions } from './app-bootstrap-base.helper.js';
const { curry } = lodash;

export function isDynamicModule(module: any): module is DynamicModule {
  return module.module !== undefined;
}

export const executeFunctionForApp = async (
  app: INestApplicationContext,
  serviceType: any,
  fn: { (service: any): Promise<any> },
  options: { closeApp?: boolean },
): Promise<void> => {
  await app.init();

  const service = await app.resolve(serviceType);

  await fn(service).finally(async () => {
    if (options.closeApp) await app.close();
  });
};

export interface IStandaloneOptions extends IGlobalOptions {
  appAlias?: string
}

/**
 * Curried version of the executeStandaloneFunctionForApp to memoize the app
 * Use it when you need to run the executeStandaloneFunction multiple time
 * @see https://lodash.com/docs/#curry
 * @param module
 * @returns
 */
export const curriedExecuteStandaloneFunction = async <
  TOptions extends IStandaloneOptions,
>(
  module: any,
  options?: TOptions,
) =>
  curry(executeFunctionForApp)(
    (
      await new StandaloneAppBootstrap(
        options?.appAlias ??
          (isDynamicModule(module) ? module.module.name : module.name),
        module,
        options,
      ).initApp()
    ).getApp(),
  );

export const curriedExecuteAppFunction = async <
  TOptions extends IStandaloneOptions,
>(
  module: any,
  options?: TOptions,
) =>
  curry(executeFunctionForApp)(
    (
      await new AppBootstrap(
        options?.appAlias ??
          (isDynamicModule(module) ? module.module.name : module.name),
        module,
        options,
      ).initApp()
    ).getApp(),
  );

/**
 *
 */
export const executeStandaloneFunction = async <
  TService,
  TOptions extends IGlobalOptions,
>(
  module: DynamicModule | Type<any>,
  serviceType: ClassType<TService>,
  fn: { (service: TService): Promise<any> },
  options?: TOptions,
  executeOptions: { closeApp?: boolean } = {},
) => {
  return (await curriedExecuteStandaloneFunction(module, options))(
    serviceType,
    fn,
    executeOptions,
  );
};
