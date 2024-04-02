import { IServiceConf } from '@nestjs-yalc/app/conf.type.js';
import { yalcBaseConfigFactory } from '@nestjs-yalc/app/config-factory.helper.js';

export const ConfFactory = async (): Promise<IServiceConf> => {
  return yalcBaseConfigFactory({
    appName: 'platform',
  });
};
