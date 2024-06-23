import { ArgsType, Field } from '@nestjs/graphql';
import {
  filterExpressionInputFactory,
  SortModel,
  sortModelFactory,
} from './api-graphql/crud-gen.input.js';
import { FilterScalar } from './filter.scalar.js';
import { ClassType } from '@nestjs-yalc/types/globals.d.js';
import { RowDefaultValues } from './crud-gen.enum.js';
import { ICrudGenBaseParams } from './api-graphql/crud-gen-gql.interface.js';

export const typeMap = new WeakMap();
export function crudGenParamsFactory(
  defaultValues?: ICrudGenBaseParams,
  entityModel?: ClassType,
): { new (): ICrudGenBaseParams } {
  const SortType = entityModel ? [sortModelFactory(entityModel)] : [SortModel];
  const FilterType = entityModel
    ? filterExpressionInputFactory(entityModel)
    : FilterScalar;

  @ArgsType()
  class CrudGenParams implements ICrudGenBaseParams {
    startRow: number = defaultValues?.startRow ?? RowDefaultValues.START_ROW;
    endRow: number = defaultValues?.endRow ?? RowDefaultValues.END_ROW;
    @Field(() => SortType, {
      nullable: true,
      defaultValue: defaultValues?.sorting,
    })
    sorting?: typeof SortType;
    @Field(() => FilterType, {
      nullable: true,
      defaultValue: defaultValues?.filters,
    })
    filters?: typeof FilterType;
  }

  typeMap.set(CrudGenParams, CrudGenParams);
  return typeMap.get(CrudGenParams);
}

export function crudGenParamsNoPaginationFactory(
  defaultValues?: ICrudGenBaseParams,
  entityModel?: ClassType,
): { new (): ICrudGenBaseParams } {
  const SortType = entityModel ? [sortModelFactory(entityModel)] : [SortModel];
  const FilterType = entityModel
    ? filterExpressionInputFactory(entityModel)
    : FilterScalar;

  @ArgsType()
  class CrudGenParamsNoPagination implements ICrudGenBaseParams {
    @Field(() => SortType, {
      nullable: true,
      defaultValue: defaultValues?.sorting,
    })
    sorting?: typeof SortType;

    @Field(() => FilterType, {
      nullable: true,
      defaultValue: defaultValues?.filters,
    })
    filters?: typeof FilterType;
  }

  typeMap.set(CrudGenParamsNoPagination, CrudGenParamsNoPagination);
  return typeMap.get(CrudGenParamsNoPagination);
}
