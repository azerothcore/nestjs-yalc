import {
  CrudGenDependencyFactory,
  getProviderToken,
} from '@nestjs-yalc/crud-gen/crud-gen.helpers.js';
import { resolverFactory } from '@nestjs-yalc/crud-gen/api-graphql/generic.resolver.js';
import { GQLDataLoader } from '@nestjs-yalc/data-loader/dataloader.helper.js';
import returnValue from '@nestjs-yalc/utils/returnValue.js';
import { UseGuards } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { GqlExecutionContext, Mutation, Resolver } from '@nestjs/graphql';
import {
  YalcUserType,
  SkeletonUserCreateInput,
  SkeletonUserUpdateInput,
  SkeletonUserCondition,
} from './user.dto.js';
import { YalcUserEntity } from './user.entity.js';
import { RoleAuth, RoleEnum } from './role.guard.js';
import { YalcUserService } from './user.service.js';
import { InputArgs } from '@nestjs-yalc/crud-gen/api-graphql/gqlmapper.decorator.js';
import {
  ExtraArgsStrategy,
  FilterType,
  GeneralFilters,
} from '@nestjs-yalc/crud-gen/crud-gen.enum.js';

export const lowerCaseEmailMiddleware = (
  _ctx: GqlExecutionContext,
  input: YalcUserType,
  value: boolean,
) => {
  if (value === true) {
    input.email = input.email.toLowerCase();
  }
};

@Resolver(returnValue(YalcUserType))
export class SkeletonUserResolver extends resolverFactory({
  service: {
    serviceToken: getProviderToken(YalcUserService),
  },
  entityModel: YalcUserEntity,
  dto: YalcUserType,
  input: {
    create: SkeletonUserCreateInput,
    update: SkeletonUserUpdateInput,
    conditions: SkeletonUserCondition,
  },
  prefix: 'SkeletonModule_',
  queries: {
    // SkeletonModule_getSkeletonUser
    getResource: {
      decorators: [UseGuards(RoleAuth([RoleEnum.PUBLIC]))],
      idName: 'guid',
      queryParams: {
        // name: 'getSkeletonUser',
        description: 'Get a specific user',
      },
    },
    getResourceGrid: {
      decorators: [UseGuards(RoleAuth([RoleEnum.PUBLIC]))],
      extraArgs: {
        firstName: {
          filterCondition: GeneralFilters.CONTAINS,
          filterType: FilterType.TEXT,
          options: {
            type: () => String,
            nullable: true,
          },
        },
        lastName: {
          filterCondition: GeneralFilters.CONTAINS,
          filterType: FilterType.TEXT,
          options: {
            type: () => String,
            nullable: true,
          },
        },
      },
      extraArgsStrategy: ExtraArgsStrategy.AT_LEAST_ONE,
      queryParams: {
        // name: 'getSkeletonUserGrid',
        description: 'Get a list of users',
      },
    },
  },
  mutations: {
    createResource: {
      decorators: [UseGuards(RoleAuth([RoleEnum.PUBLIC]))],
      extraInputs: {
        lowerCaseEmail: {
          gqlOptions: {
            description: 'Force the email to be in lowercase',
            type: () => Boolean,
            defaultValue: true,
            nullable: true,
          },
          middleware: lowerCaseEmailMiddleware,
        },
      },
      queryParams: {
        // name: 'createSkeletonUser',
        description: 'Create a new user',
      },
    },
    updateResource: {
      decorators: [UseGuards(RoleAuth([RoleEnum.PUBLIC]))],
      queryParams: {
        // name: 'updateSkeletonUser',
        description: 'Update an existing user',
      },
    },
    deleteResource: {
      decorators: [UseGuards(RoleAuth([RoleEnum.PUBLIC]))],
      queryParams: {
        // name: 'deleteSkeletonUser',
        description: 'Delete an existing user',
      },
    },
  },
}) {
  constructor(
    protected service: YalcUserService,
    protected dataloader: GQLDataLoader,
    protected moduleRef: ModuleRef,
  ) {
    super(service, dataloader, moduleRef);
  }

  @UseGuards(RoleAuth([RoleEnum.PUBLIC]))
  @Mutation(returnValue(String), {
    description:
      'Reset user password with a random one and send the new value back.',
  })
  public async SkeletonModule_generateRandomPassword(
    @InputArgs({
      _name: 'ID',
    })
    ID: string,
  ): Promise<string> {
    return this.service.resetPassword(ID);
  }
}

export const skeletonUserProvidersFactory = (dbConnection: string) =>
  CrudGenDependencyFactory<YalcUserEntity>({
    // The model used for TypeORM
    entityModel: YalcUserEntity,
    resolver: {
      provider: SkeletonUserResolver,
    },

    service: {
      dbConnection: dbConnection,
      entityModel: YalcUserEntity,
      provider: {
        provide: YalcUserService,
        useClass: YalcUserService,
      },
    },
    dbConnection,
    dataloader: { databaseKey: 'guid' },
  });
