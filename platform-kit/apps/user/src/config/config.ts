import { IServiceWithTypeORMConf } from '@nestjs-yalc/app/conf.type.js';
import { yalcBaseConfigFactoryWithTypeOrm } from '@nestjs-yalc/app/config-factory.helper.js';
import { APP_ALIAS_USER } from '../user.def.ts';

export const ConfFactory = async (): Promise<IServiceWithTypeORMConf> => {
  return yalcBaseConfigFactoryWithTypeOrm({
    appName: APP_ALIAS_USER,
    typeorm: {
      type: 'mysql',
      database: 'user',
      // synchronize: !envIsTrue(process.env.TYPEORM_NO_SEL_DB),
    },
  });
};
