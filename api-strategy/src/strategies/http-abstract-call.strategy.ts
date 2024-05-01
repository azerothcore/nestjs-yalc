import { HTTPMethods } from '@nestjs-yalc/types/globals.d.js';
import { OutgoingHttpHeaders, IncomingHttpHeaders } from 'node:http2';
import { IApiCallStrategy } from '../context-call.interface.js';

export interface IHttpCallStrategyOptions {
  headersWhitelist?: string[];
}

/**
 * This options should be compliant to all the http-based call strategies
 */
// do not
export interface HttpOptions<
  TData = string | object | Buffer | NodeJS.ReadableStream,
  TParams extends Record<string, any> = Record<string, any>,
> {
  headers?: IncomingHttpHeaders & { [key: string]: string | string [] };
  method?: HTTPMethods;
  signal?: AbortSignal;
  Request?: object;
  data?: TData;
  parameters?: TParams;
}

export interface IHttpCallStrategyResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: OutgoingHttpHeaders;
  // config: AxiosRequestConfig<D>;
  request?: any;
}

export interface IHttpCallStrategy extends IApiCallStrategy {
  call<TOptData, TParams extends Record<string, any>, TResData>(
    path: string,
    options?: HttpOptions<TOptData, TParams> | { method?: string },
  ): Promise<IHttpCallStrategyResponse<TResData>>;
  get<TOptData, TParams extends Record<string, any>, TResData>(
    path: string,
    options?: HttpOptions<TOptData, TParams> | { method?: string },
  ): Promise<IHttpCallStrategyResponse<TResData>>;
  post<TOptData, TParams extends Record<string, any>, TResData>(
    path: string,
    options?: HttpOptions<TOptData, TParams> | { method?: string },
  ): Promise<IHttpCallStrategyResponse<TResData>>;
}

export abstract class HttpAbstractStrategy implements IHttpCallStrategy {
  abstract call<TOptData, TParams extends Record<string, any>, TResData>(
    path: string,
    options?: HttpOptions<TOptData, TParams> | { method?: string },
  ): Promise<IHttpCallStrategyResponse<TResData>>;

  get<TOptData, TParams extends Record<string, any>, TResData>(
    path: string,
    options?: HttpOptions<TOptData, TParams> | { method?: string },
  ): Promise<IHttpCallStrategyResponse<TResData>> {
    return this.call<TOptData, TParams, TResData>(path, {
      ...options,
      method: 'GET',
    });
  }

  post<TOptData, TParams extends Record<string, any>, TResData>(
    path: string,
    options?: HttpOptions<TOptData, TParams> | { method?: string },
  ): Promise<IHttpCallStrategyResponse<TResData>> {
    return this.call<TOptData, TParams, TResData>(path, {
      ...options,
      method: 'POST',
    });
  }
}
