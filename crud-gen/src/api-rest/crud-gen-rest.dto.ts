import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ClassType } from '@nestjs-yalc/types';
import {
  entityFieldsEnumFactory,
  RowDefaultValues,
  SortDirection,
} from '../crud-gen.enum.js';
import {
  ICrudGenBaseParams,
  ICrudGenSimpleParams,
  ISortModel,
  ISortModelStrict,
} from '../api-graphql/crud-gen-gql.interface.js';
import { IPageDataCrudGen } from '../crud-gen.interface.js';
import { Exclude, Expose } from 'class-transformer';
import { ParseInt } from '@nestjs-yalc/field-middleware/class-transformer.helper.js';

export class CGQueryDto<T = any>
  extends PaginationDTOMixin()
  implements ICrudGenBaseParams<T> {}

/**
 * @deprecated use sortModelRestFactory instead
 */
export class SortModelRest<T = any> implements ISortModel<T> {
  @IsString()
  colId!: string;

  sort!: SortDirection;
}

const sortModelCacheMap = new WeakMap();
export function sortModelRestFactory<Entity>(entityModel: ClassType<Entity>) {
  const cached = sortModelCacheMap.get(entityModel);
  if (cached) return cached;

  const fieldsEnum = entityFieldsEnumFactory(entityModel);
  class SortModel implements ISortModelStrict<typeof fieldsEnum> {
    colId!: keyof typeof fieldsEnum;

    sort: SortDirection = SortDirection.ASC;
  }

  sortModelCacheMap.set(entityModel, SortModel);

  return SortModel;
}

export const typeMap = new WeakMap();
export function crudGenRestParamsFactory(
  defaultValues?: ICrudGenBaseParams,
  entityModel?: ClassType,
): { new (): ICrudGenBaseParams } {
  const SortType = entityModel
    ? [sortModelRestFactory(entityModel)]
    : [SortModelRest];

  /** @todo implement filters */

  // const FilterType = entityModel
  //   ? filterExpressionInputFactory(entityModel)
  //   : FilterScalar;

  class CrudGenParams implements ICrudGenBaseParams {
    startRow: number = defaultValues?.startRow ?? RowDefaultValues.START_ROW;
    endRow: number = defaultValues?.endRow ?? RowDefaultValues.END_ROW;
    sorting?: typeof SortType;
    // filters?: typeof FilterType;
  }

  typeMap.set(CrudGenParams, CrudGenParams);
  return typeMap.get(CrudGenParams);
}

export function crudGenRestParamsNoPaginationFactory(
  defaultValues?: ICrudGenBaseParams,
  entityModel?: ClassType,
): { new (): ICrudGenBaseParams } {
  const SortType = entityModel
    ? [sortModelRestFactory(entityModel)]
    : [SortModelRest];

  /** @todo implement filters */

  // const FilterType = entityModel
  //   ? filterExpressionInputFactory(entityModel)
  //   : FilterScalar;

  class CrudGenParams implements ICrudGenBaseParams {
    sorting?: typeof SortType = defaultValues?.sorting;
    // filters?: typeof FilterType = defaultValues?.filters;
  }

  typeMap.set(CrudGenParams, CrudGenParams);
  return typeMap.get(CrudGenParams);
}

@Exclude()
export class PageData implements IPageDataCrudGen {
  @Expose()
  public count!: number;

  @Expose()
  public startRow!: number;

  @Expose()
  public endRow!: number;
}

@Exclude()
export class PaginatedResultDto<T> {
  @Expose()
  list: T[];

  @Expose()
  pageData: PageData;

  constructor(list: T[], pageData: PageData) {
    this.list = list;
    this.pageData = pageData;
  }
}

export class CGRestQueryArgs<T = any>
  extends PaginationDTOMixin()
  implements ICrudGenSimpleParams<T> {
  /**
   * @todo implements other properties (where, select, sort, etc.)
   */
}

export function PaginationDTOMixin(base: ClassType = class {}) {
  class PaginationDTO extends base {
    @IsOptional()
    @IsInt()
    @ParseInt()
    @Min(0)
    startRow?: number = RowDefaultValues.START_ROW;

    @IsOptional()
    @IsInt()
    @ParseInt()
    @Min(0)
    endRow?: number = RowDefaultValues.END_ROW;
  }

  return PaginationDTO;
}
