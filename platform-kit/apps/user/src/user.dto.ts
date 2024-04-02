import {
  HideField,
  InputType,
  ObjectType,
  OmitType,
  PartialType,
} from '@nestjs/graphql';
import {
  ModelField,
  ModelObject,
} from '@nestjs-yalc/crud-gen/object.decorator.js';
import { YalcUserEntity } from './user.entity.js';
import returnValue from '@nestjs-yalc/utils/returnValue.js';
import { UUIDScalar } from '@nestjs-yalc/graphql/scalars/uuid.scalar.js';
import { YalcPhoneType } from './user-phone.dto.js';
import { type TypeRef } from '@nestjs-yalc/types';

@ModelObject()
@ObjectType()
export class YalcUserType extends YalcUserEntity {
  @ModelField<YalcPhoneType>({
    gqlType: () => [YalcPhoneType],
    relation: {
      type: () => YalcPhoneType,
      relationType: 'one-to-many',
      sourceKey: { dst: 'guid', alias: 'guid' },
      targetKey: { dst: 'userId', alias: 'userId' },
    },
  })
  declare SkeletonPhone?: TypeRef<YalcPhoneType[]>;

  @HideField()
  declare password: string;

  // guid should be always required in SQL queries to make sure that the relation
  // is always resolved, and it should be exposed as a UUID Scalar to GraphQL
  @ModelField({
    gqlType: returnValue(UUIDScalar),
    gqlOptions: {
      name: 'ID',
      description: 'The user ID generated with UUID',
    },
    isRequired: true,
  })
  declare guid: string;

  @ModelField({
    gqlOptions: {
      description: "It's the combination of firstName and lastName",
    },
    denyFilter: true,
  })
  declare fullName: string;
}

/**
 * Here all the input type for Graphql
 */
@InputType()
@ModelObject()
export class SkeletonUserCreateInput extends OmitType(
  YalcUserType,
  ['SkeletonPhone', 'fullName', 'createdAt', 'updatedAt'] as const,
  InputType,
) {}

@InputType()
@ModelObject({ copyFrom: YalcUserType })
export class SkeletonUserCondition extends PartialType(
  SkeletonUserCreateInput,
  InputType,
) {}

@InputType()
@ModelObject({ copyFrom: YalcUserType })
export class SkeletonUserUpdateInput extends OmitType(
  YalcUserType,
  ['guid', 'SkeletonPhone', 'fullName', 'createdAt', 'updatedAt'] as const,
  InputType,
) {}
