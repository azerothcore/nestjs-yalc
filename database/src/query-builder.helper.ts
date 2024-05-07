import {
  FindManyOptions,
  FindOperator,
  ObjectLiteral,
  QueryBuilder,
  QueryRunner,
  SelectQueryBuilder,
} from 'typeorm';
import { SortDirection } from '@nestjs-yalc/crud-gen/crud-gen.enum.js';
import {
  IFieldMapper,
  isFieldMapper,
} from '@nestjs-yalc/interfaces/maps.interface.js';
import { isJsonSQLRaw } from './json.helpers.js';
import { CrudGenFindManyOptions } from '@nestjs-yalc/crud-gen/api-graphql/crud-gen-gql.interface.js';
// import {
//   IJsonVirtualFieldOptions,
//   NYALC_JSON_VIRTUAL_FIELD_META_KEY,
// } from './json.entity.js';

export type FindAndCountResult<Entity> = [Entity[], number];
type GetOneResult<Entity> = Entity | undefined;
type GetOneOrFailResult<Entity> = Entity;
type GetManyResult<Entity> = Entity[];
type GetCountResult = number;
type AnyResult = any;

export type QueryBuilderOperationResult<Entity> =
  | GetOneResult<Entity>
  | GetOneOrFailResult<Entity>
  | GetManyResult<Entity>
  | FindAndCountResult<Entity>
  | AnyResult
  | GetCountResult;

// we can't export const enum with isolatedModules https://ncjamieson.com/dont-export-const-enums/
export enum ReplicationMode {
  MASTER = 'master',
  SLAVE = 'slave',
}

export class QueryBuilderHelper {
  /**
   * Runs a getManyAndCount grouped by the specified columns for the passed queryBuilder
   * Implementes work-around for grouped getManyAndCount queries, because of TypeORM bug
   * @url https://github.com/typeorm/typeorm/issues/544
   * @param queryBuilder The Query Builder
   * @param groupColumns The columns the query is being grouped
   */
  public static async getGroupedManyAndCount<Entity>(
    queryBuilder: SelectQueryBuilder<any>,
    groupColumns: string[],
  ): Promise<FindAndCountResult<Entity>> {
    return Promise.all([
      new Promise<Entity[]>((resolve, reject) => {
        const dataQb = queryBuilder.clone();
        dataQb.groupBy(groupColumns.join(', '));
        dataQb
          .getMany()
          .then((values) => resolve(values))
          .catch((err) => reject(err));
      }),
      new Promise<number>((resolve, reject) => {
        const countQb = queryBuilder.clone();
        const escapedGroupColumns: string[] = groupColumns.map((column) =>
          countQb.escape(column),
        );
        countQb.skip(0);
        countQb.select(
          `COUNT(DISTINCT (${escapedGroupColumns.join(', ')})) as count`,
        );
        countQb.orderBy('NULL');
        countQb
          .getRawOne()
          .then((value) => resolve(value.count ? Number(value.count) : 0))
          .catch((err) => reject(err));
      }),
    ]);
  }

  /*
   * When running queries on a replicated database,
   * TypeOrm requires to specify where you would like to apply
   * these operations. (Master or Slave)
   *
   * TypeOrm also passes the reponsability to the developer
   * when explicitly setting a QueryRunner, meaning that when the work is
   * finished you need to release the QueryRunner.
   *
   * The QueryBuilder can be created from EntityManagers or repositories.
   * They have different API's for obtaining a QueryBuilder.
   */
  /**
   * Runs an operation for the passed QueryBuilder with the specified replication mode
   * @param queryBuilder The QueryBuilder object
   * @param mode Replication mode
   * @param operationFn The operation to apply to the QueryBuilder
   */
  public static async applyOperationToQueryBuilder<
    Entity extends ObjectLiteral,
  >(
    queryBuilder: SelectQueryBuilder<Entity>,
    mode: ReplicationMode,
    operationFn: (
      queryBuilder: SelectQueryBuilder<Entity>,
    ) => Promise<QueryBuilderOperationResult<Entity>>,
  ): Promise<QueryBuilderOperationResult<Entity>> {
    let queryRunner: QueryRunner | undefined = undefined;
    const { connection } = queryBuilder;
    const { isReplicated } = connection.driver;

    if (isReplicated) {
      queryRunner = connection.createQueryRunner(mode);
      queryBuilder.setQueryRunner(queryRunner);
    }

    return operationFn(queryBuilder).finally(async () => {
      await queryRunner?.release();
    });
  }

  /**
   * Converts FindOperator to the correct format for queryBuilder
   * including aliasPath for nested resources.
   * https://github.com/typeorm/typeorm/issues/4484 issue describing not being able to do this for relations
   * We took this function from https://github.com/typeorm/typeorm/blob/master/src/query-builder/QueryBuilder.ts
   * Since it is protected we can not use the function directly.
   */
  public static computeFindOperatorExpression<Entity extends ObjectLiteral>(
    queryBuilder: QueryBuilder<Entity> | undefined,
    operator: FindOperator<any>,
    aliasPath: string,
    parameters: any,
  ): string {
    parameters = Array.isArray(parameters) ? parameters : [parameters];

    //Recursive call of computeFindOperatorExpression add the ' or " to the string, we would avoid that
    parameters = parameters.map((v: any) => {
      return typeof v === 'string'
        ? v[0] === v[v.length - 1] && (v[0] === "'" || v[0] === '"')
          ? v
          : `'${v}'`
        : v;
    });

    parameters = parameters.map((v: any) => {
      if (
        typeof v === 'string' ||
        typeof v === 'number' ||
        typeof v === 'boolean'
      ) {
        return v;
      } else {
        const date = Date.parse(v);
        return isNaN(date) ? v : date;
      }
    });

    switch (operator.type) {
      case 'not':
        if (operator.child) {
          return `NOT(${this.computeFindOperatorExpression(
            queryBuilder,
            operator.child,
            aliasPath,
            parameters,
          )})`;
        } else {
          return `${aliasPath} != ${parameters[0]}`;
        }
      case 'lessThan':
        return `${aliasPath} < ${parameters[0]}`;
      case 'lessThanOrEqual':
        return `${aliasPath} <= ${parameters[0]}`;
      case 'moreThan':
        return `${aliasPath} > ${parameters[0]}`;
      case 'moreThanOrEqual':
        return `${aliasPath} >= ${parameters[0]}`;
      case 'equal':
        return `${aliasPath} = ${parameters[0]}`;
      case 'ilike': {
        if (queryBuilder === undefined) {
          throw new Error(
            `To use the 'ilike' filter the query builder should be defined`,
          );
        }
        const { driver } = queryBuilder.connection;
        if (
          driver.options &&
          (driver.options.type === 'postgres' || // postgres
            driver.options.type === 'cockroachdb') // cockroachdb
        ) {
          return `${aliasPath} ILIKE ${parameters[0]}`;
        }

        return `UPPER(${aliasPath}) LIKE UPPER(${parameters[0]})`;
      }
      case 'like':
        return `${aliasPath} LIKE ${parameters[0]}`;
      case 'between':
        return `${aliasPath} BETWEEN ${parameters[0]} AND ${parameters[1]}`;
      case 'in':
        if (parameters.length === 0) {
          return '0=1';
        }
        return `${aliasPath} IN (${parameters.join(', ')})`;
      case 'any':
        return `${aliasPath} = ANY(${parameters[0]})`;
      case 'isNull':
        return `${aliasPath} IS NULL`;
      case 'raw':
        if (operator.getSql) {
          return operator.getSql(aliasPath);
        } else {
          return `${aliasPath} = ${operator.value}`;
        }
    }

    throw new TypeError(
      `Unsupported FindOperator ${FindOperator.constructor.name}`,
    );
  }

  public static getMapper(
    fieldMap: {
      parent: IFieldMapper;
      joined: IFieldMapper | { [key: string]: IFieldMapper };
    },
    alias: string,
  ): IFieldMapper {
    return isFieldMapper(fieldMap.joined)
      ? fieldMap.joined
      : fieldMap.joined[alias];
  }

  public static convertFieldWithMap(field: string, map: IFieldMapper) {
    if (field in map) {
      return map[field].mode === 'derived' && map[field]._propertyName
        ? (map[field]._propertyName as string)
        : map[field].dst;
    }
    return field;
  }

  public static applyOrderToJoinedQueryBuilder(
    findOptions: CrudGenFindManyOptions,
    parentName: string,
    fieldMap?: {
      parent: IFieldMapper;
      joined: IFieldMapper | { [key: string]: IFieldMapper };
    },
  ): { key: string; operator: SortDirection }[] {
    const sortingColumns: any[] = [];
    let alias: string;
    let mapper: IFieldMapper;

    // console.log(findOptions.extra?._keysMeta);

    for (const key in findOptions.order as ObjectLiteral) {
      //If is a nested resource we need to change the name format into Parent__Joined_resource
      if (key.includes('.') && fieldMap) {
        const splitted = key.split('.');
        alias = splitted[0];
        mapper = this.getMapper(fieldMap, alias);

        const fieldInfo = mapper[splitted[1]];
        const prefix =
          fieldInfo && fieldInfo.mode === 'derived'
            ? `${splitted[0]}_`
            : `${splitted[0]}.`;

        const newKey = `${prefix}${this.convertFieldWithMap(
          splitted[1],
          mapper,
        )}`;
        sortingColumns.push({
          key: newKey, // we have to alias this way
          operator: (findOptions.order as ObjectLiteral)[key],
        });
        // delete any findOptions on children, so they won't mess with applyFindMany...
        delete (findOptions.order as ObjectLiteral)[key];
      }
    }

    const findOptionsOrder: FindManyOptions = { order: findOptions.order };
    //If we have other order we'll apply here
    if (findOptionsOrder.order) {
      for (const i of Object.keys(findOptionsOrder.order)) {
        const fieldInfo =
          fieldMap?.parent[i] ?? findOptions.extra?._fieldMapper?.[i];
        const prefix =
          fieldInfo && fieldInfo.mode === 'derived'
            ? `${parentName}_`
            : `${parentName}.`;

        sortingColumns.push({
          key: `${prefix}${
            fieldMap ? this.convertFieldWithMap(i, fieldMap.parent) : i
          }`,
          operator: findOptionsOrder.order[i],
        });
      }
    }
    return sortingColumns;
  }

  public static addAlias(
    key: string,
    alias?: string,
    fieldMap?: {
      parent: IFieldMapper;
      joined: IFieldMapper | { [key: string]: IFieldMapper };
    },
    options?: { escapeCharacter?: string },
  ): string {
    const { escapeCharacter = '' } = options || {};

    /**
     * Do not apply alias for JSON fields
     * @todo: improve logic
     */
    if (isJsonSQLRaw(key)) {
      return key;
    }

    //If the name is of a joined resource we take the joined table name
    if (key.includes('.')) {
      const splitted = key.split('.');
      alias = splitted[0];

      if (fieldMap) {
        const mapper = this.getMapper(fieldMap, alias);

        key = this.convertFieldWithMap(splitted[1], mapper);
      } else {
        key = splitted[1];
      }
    }
    return alias
      ? `${escapeCharacter}${alias}${escapeCharacter}.${escapeCharacter}${key}${escapeCharacter}`
      : key;
  }
}
