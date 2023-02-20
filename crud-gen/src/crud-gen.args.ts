import { ArgsType, Field } from '@nestjs/graphql';
import { FilterInput } from './crud-gen.interface.js';
import {
  filterExpressionInputFactory,
  ISortModelStrict,
  JoinArgOptions,
  SortModel,
  sortModelFactory,
} from './crud-gen.input.js';
import { FilterScalar } from './filter.scalar.js';
import returnValue from '@nestjs-yalc/utils/returnValue.js';
import { ClassType } from '@nestjs-yalc/types/globals.d.js';
import { RowDefaultValues } from './crud-gen.enum.js';

export interface IAgQueryParams<T = any> {
  [index: string]: any; // dynamic parameters
  startRow?: number;
  endRow?: number;
  sorting?: ISortModelStrict<T>[];
  filters?: FilterInput;
  join?: { [index: string]: JoinArgOptions };
}

export const typeMap = new WeakMap();
export function agQueryParamsFactory(
  defaultValues?: IAgQueryParams,
  entityModel?: ClassType,
): { new (): IAgQueryParams } {
  const SortType = entityModel ? [sortModelFactory(entityModel)] : [SortModel];
  const FilterType = entityModel
    ? filterExpressionInputFactory(entityModel)
    : FilterScalar;

  @ArgsType()
  class AgQueryParams implements IAgQueryParams {
    startRow: number = defaultValues?.startRow ?? RowDefaultValues.START_ROW;
    endRow: number = defaultValues?.endRow ?? RowDefaultValues.END_ROW;
    @Field(returnValue(SortType), {
      nullable: true,
      defaultValue: defaultValues?.sorting,
    })
    sorting?: typeof SortType;
    @Field(returnValue(FilterType), {
      nullable: true,
      defaultValue: defaultValues?.filters,
    })
    filters?: typeof FilterType;
  }

  typeMap.set(AgQueryParams, AgQueryParams);
  return typeMap.get(AgQueryParams);
}

export function agQueryParamsNoPaginationFactory(
  defaultValues?: IAgQueryParams,
  entityModel?: ClassType,
): { new (): IAgQueryParams } {
  const SortType = entityModel ? [sortModelFactory(entityModel)] : [SortModel];
  const FilterType = entityModel
    ? filterExpressionInputFactory(entityModel)
    : FilterScalar;

  @ArgsType()
  class AgQueryParams implements IAgQueryParams {
    @Field(returnValue(SortType), {
      nullable: true,
      defaultValue: defaultValues?.sorting,
    })
    sorting?: typeof SortType;
    @Field(returnValue(FilterType), {
      nullable: true,
      defaultValue: defaultValues?.filters,
    })
    filters?: typeof FilterType;
  }

  typeMap.set(AgQueryParams, AgQueryParams);
  return typeMap.get(AgQueryParams);
}
