import { ClassType } from '@nestjs-yalc/types/globals.d.js';
import { DynamicModule, INestApplicationContext } from '@nestjs/common';
import { StandaloneAppBootstrap } from './app-bootstrap-standalone.helper.js';
import lodash from 'lodash';
import { AppBootstrap } from './app-bootstrap.helper.js';
const { curry } = lodash;

export function isDynamicModule(module: any): module is DynamicModule {
  return module.module !== undefined;
}

export const executeFunctionForApp = async (
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
export const curriedExecuteStandaloneFunction = async (
  module: any,
  appAlias?: string,
) => {
  return curry(executeFunctionForApp)(
    (
      await new StandaloneAppBootstrap(
        appAlias ??
          (isDynamicModule(module) ? module.module.name : module.name),
        module,
      ).initApp()
    ).getApp(),
  );
};

export const curriedExecuteAppFunction = async (
  module: any,
  appAlias?: string,
) =>
  curry(executeFunctionForApp)(
    (
      await new AppBootstrap(
        appAlias ??
          (isDynamicModule(module) ? module.module.name : module.name),
        module,
      ).initApp()
    ).getApp(),
  );

/**
 *
 */
export const executeStandaloneFunction = async <TService>(
  module: DynamicModule,
  serviceType: ClassType<TService>,
  fn: { (service: TService): Promise<any> },
) => {
  return (await curriedExecuteStandaloneFunction(module))(serviceType, fn);
};
