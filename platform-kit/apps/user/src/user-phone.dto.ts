import { InputType, ObjectType, OmitType, PartialType } from '@nestjs/graphql';
import {
  ModelField,
  ModelObject,
} from '@nestjs-yalc/crud-gen/object.decorator.js';
import { YalcUserPhoneEntity } from './user-phone.entity.js';
import { UUIDScalar } from '@nestjs-yalc/graphql/scalars/uuid.scalar.js';
import returnValue from '@nestjs-yalc/utils/returnValue.js';
import { YalcUserType } from './user.dto.js';
import { type TypeRef } from '@nestjs-yalc/types';

@ObjectType()
@ModelObject()
export class YalcPhoneType extends YalcUserPhoneEntity {
  @ModelField({
    gqlType: /* istanbul ignore next */ () => YalcUserType,
    // relation: {
    //   relationType: 'one-to-many',
    // },
  })
  declare SkeletonUser?: TypeRef<YalcUserType>;

  @ModelField({ gqlType: returnValue(UUIDScalar) })
  declare userId: string;
}

/**
 * Here all the input type for Graphql
 */
@InputType()
@ModelObject()
export class SkeletonPhoneCreateInput extends OmitType(
  YalcPhoneType,
  ['SkeletonUser'] as const,
  InputType,
) {}

@InputType()
@ModelObject({ copyFrom: YalcPhoneType })
export class SkeletonPhoneCondition extends PartialType(
  SkeletonPhoneCreateInput,
  InputType,
) {}

@InputType()
@ModelObject({ copyFrom: YalcPhoneType })
export class SkeletonPhoneUpdateInput extends OmitType(
  YalcPhoneType,
  ['userId', 'SkeletonUser'] as const,
  InputType,
) {}
