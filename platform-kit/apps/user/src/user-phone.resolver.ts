import { CrudGenDependencyFactory } from '@nestjs-yalc/crud-gen/crud-gen.helpers.js';
import {
  YalcPhoneType,
  SkeletonPhoneCreateInput,
  SkeletonPhoneUpdateInput,
  SkeletonPhoneCondition,
} from './user-phone.dto.js';
import { YalcUserPhoneEntity } from './user-phone.entity.js';

export const yalcPhoneProviderFactory = (dbConnection: string) =>
  CrudGenDependencyFactory<YalcUserPhoneEntity>({
    // The model used for TypeORM
    entityModel: YalcUserPhoneEntity,
    resolver: {
      dto: YalcPhoneType,
      input: {
        create: SkeletonPhoneCreateInput,
        update: SkeletonPhoneUpdateInput,
        conditions: SkeletonPhoneCondition,
      },
      prefix: 'SkeletonModule_',
    },
    service: { dbConnection },
    dataloader: { databaseKey: 'phoneNumber' },
    dbConnection,
  });
