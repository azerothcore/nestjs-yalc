/* eslint-disable no-var */

declare global {
  var __JEST_DISABLE_DB: boolean;
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: 'development' | 'production' | 'test' | 'pipeline';
    }
  }
}

type StaticInterface<
  TClass extends IStaticInterface & {
    new (...args: any[]): TClass;
  },
  IStaticInterface,
> = InstanceType<TClass>;

export type InstanceType<T> = T extends new (...args: any[]) => infer R
  ? R
  : never;

export declare type ClassType<TClass = any, TArgs extends any[] = any[]> = {
  new (...args: TArgs): TClass;
};

export declare type AnyFunction<A = any> = (...input: any[]) => A;
export declare type AnyConstructor<A = Record<string, unknown>> = new (
  ...input: any[]
) => A;

export declare type Mixin<T extends AnyFunction> = InstanceType<ReturnType<T>>;

// Names of properties in T with types that include undefined
type OptionalPropertyNames<T> = {
  [K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];

// Common properties from L and R with undefined in R[K] replaced by type in L[K]
type SpreadProperties<L, R, K extends keyof L & keyof R> = {
  [P in K]: L[P] | Exclude<R[P], undefined>;
};

type Id<T> = T extends infer U ? { [K in keyof U]: U[K] } : never; // see note at bottom*

// Type of { ...L, ...R }
type Spread<L, R> = Id<
  // Properties in L that don't exist in R
  Pick<L, Exclude<keyof L, keyof R>> &
    // Properties in R with types that exclude undefined
    Pick<R, Exclude<keyof R, OptionalPropertyNames<R>>> &
    // Properties in R, with types that include undefined, that don't exist in L
    Pick<R, Exclude<OptionalPropertyNames<R>, keyof L>> &
    // Properties in R, with types that include undefined, that exist in L
    SpreadProperties<L, R, OptionalPropertyNames<R> & keyof L>
>;

type NotVoid<T extends Function> = (() => void) extends T ? never : T;

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

type XOR<T, Tcopy> = T extends object ? Without<Exclude<Tcopy, T>, T> & T : T;

type CommonKeys<T, U> = {
  [K in keyof T & keyof U]: T[K] extends U[K] ? K : never
}[keyof T & keyof U];

// This utility type creates a new type with only the common properties
type Intersect<T, U> = Pick<T, CommonKeys<T, U>>;


type ReturnOrFunctionReturnType<T> = T extends (...input: any[]) => infer R ? R : T;

type HTTPMethods =
  | 'DELETE'
  | 'delete'
  | 'GET'
  | 'get'
  | 'HEAD'
  | 'head'
  | 'PATCH'
  | 'patch'
  | 'POST'
  | 'post'
  | 'PUT'
  | 'put'
  | 'OPTIONS'
  | 'options';


/**
 * Can be used to solve circular dependencies with types
 * also used as values in the same file
 */
type TypeRef<T> = T
