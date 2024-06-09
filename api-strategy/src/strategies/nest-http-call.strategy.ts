import { ClassType } from '@nestjs-yalc/types/globals.d.js';
import { HttpService } from '@nestjs/axios';
import {
  HttpAbstractStrategy,
  IHttpCallStrategyResponse,
  HttpOptions,
  IHttpCallStrategyOptions,
} from './http-abstract-call.strategy.js';
import { AxiosHeaders, AxiosRequestConfig, AxiosResponse } from 'axios';
import { YalcGlobalClsService } from '@nestjs-yalc/app/cls.module.js';
import { filterHeaders } from '../header-whitelist.helper.js';
import { OutgoingHttpHeaders } from 'http';

export class NestHttpCallStrategy extends HttpAbstractStrategy {
  constructor(
    protected readonly httpService: HttpService,
    protected readonly clsService: YalcGlobalClsService,
    private baseUrl = '',
    protected readonly options: IHttpCallStrategyOptions = {},
  ) {
    super();
  }

  async call<TOptData, TParams extends Record<string, any>, TResData>(
    path: string,
    options?: HttpOptions<TOptData, TParams>,
  ): Promise<IHttpCallStrategyResponse<TResData, AxiosResponse['headers']>> {
    const clsHeaders = filterHeaders(
      this.clsService.get('headers'),
      this.options.headersWhitelist,
    );
    const headers = {
      ...clsHeaders,
      ...options?.headers,
    };
    /**
     * We need this to do a type check on the options and
     * implement the mapping from HttpOptions to AxiosRequestConfig
     */
    const _options:
      | {
          [k: string | number | symbol]: never;
        }
      | AxiosRequestConfig = {
      headers,
      method: options?.method,
      signal: options?.signal,
      data: options?.data,
    };

    if (options?.parameters) {
      _options.params = new URLSearchParams(options.parameters);
    }

    const { headers: axiosHeaders, ...res } =
      await this.httpService.axiosRef.request({
        headers: _options?.headers as any,
        method: _options?.method,
        signal: _options?.signal,
        data: _options?.data,
        params: _options?.params,
        url: `${this.baseUrl}${path}`,
      });

    const outgoingHeaders = Object.entries(axiosHeaders).reduce(
      (acc, [k, v]) => {
        if (v instanceof AxiosHeaders) {
          v = v.toJSON();
        }

        acc[k] = v;
        return acc;
      },
      {} as OutgoingHttpHeaders,
    );

    return {
      ...res,
      headers: outgoingHeaders,
      rawHeaders: axiosHeaders,
    };
  }
}

export interface NestHttpCallStrategyProviderOptions {
  baseUrl?: string;
  NestHttpStrategy?: ClassType<NestHttpCallStrategy>;
}

/**
 * Just a convenient provider to inject the NestLocalCallStrategy
 */
export const NestHttpCallStrategyProvider = (
  provide: string,
  options: NestHttpCallStrategyProviderOptions = {},
) => ({
  provide,
  useFactory: (httpAdapter: HttpService, clsService: YalcGlobalClsService) => {
    const _options = {
      baseUrl: '',
      NestHttpStrategy: NestHttpCallStrategy,
      ...options,
    };

    return new _options.NestHttpStrategy(
      httpAdapter,
      clsService,
      _options.baseUrl,
    );
  },
  inject: [HttpService, YalcGlobalClsService],
});
