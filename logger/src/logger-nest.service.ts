import { ConsoleLogger, ConsoleLoggerOptions } from '@nestjs/common';
import {
  IImprovedLoggerOptions,
  ILoggerPluginMethods,
  ImprovedLoggerService,
  LogMethodOptions,
  beforeLogging,
} from './logger-abstract.service.js';
import { maskDataInObject } from './logger.helper.js';
import { WithPluginSystem } from '@nestjs-yalc/utils/plugin.helper.js';

export class ImprovedNestLogger
  extends WithPluginSystem<ILoggerPluginMethods>(ConsoleLogger)
  implements ImprovedLoggerService
{
  constructor(
    context: string,
    options: ConsoleLoggerOptions,
    protected _options: IImprovedLoggerOptions = {},
  ) {
    super(context, options);
  }

  private getOptions(options: LogMethodOptions | any): LogMethodOptions {
    return typeof options === 'string' ? { message: options } : options;
  }

  private composeMessage(message: any, options: LogMethodOptions) {
    const data = {
      ...maskDataInObject(options.data, options.masks, options.trace),
      ...options.config,
    };

    return typeof message === 'string'
      ? message
      : JSON.stringify(message, null, 2) +
          (data ? `\n${JSON.stringify(data, null, 2)}` : '');
  }

  log(message: any): void;
  log(message: any, options: LogMethodOptions): void;
  log(message: any, ...optionalParams: any[]): void;
  log(
    message: unknown,
    options: LogMethodOptions = {},
    ...rest: unknown[]
  ): void {
    const _options = this.getOptions(options);

    this.beforeLogging(message, _options);

    super.log(
      this.composeMessage(message, _options),
      _options.context ?? this.context,
      ...rest,
    );
  }

  error(message: any, stack?: string | undefined): void;
  error(
    message: any,
    stack: string | undefined,
    options: LogMethodOptions,
  ): void;
  error(message: any, ...optionalParams: any[]): void;
  error(
    message: unknown,
    stack?: unknown,
    options: LogMethodOptions = {},
    ...rest: unknown[]
  ): void {
    const _options = this.getOptions(options);
    this.beforeLogging(message, _options);

    super.error(
      this.composeMessage(message, _options),
      stack,
      _options.context ?? this.context,
      ...rest,
    );
  }

  debug(message: any): void;
  debug(message: any, options: LogMethodOptions): void;
  debug(message: any, ...optionalParams: any[]): void;
  debug(
    message: unknown,
    options: LogMethodOptions = {},
    ...rest: unknown[]
  ): void {
    const _options = this.getOptions(options);
    this.beforeLogging(message, _options);

    super.debug(
      this.composeMessage(message, _options),
      _options.context ?? this.context,
      ...rest,
    );
  }

  verbose(message: any): void;
  verbose(message: any, options: LogMethodOptions): void;
  verbose(message: any, ...optionalParams: any[]): void;
  verbose(
    message: unknown,
    options: LogMethodOptions = {},
    ...rest: unknown[]
  ): void {
    const _options = this.getOptions(options);
    this.beforeLogging(message, _options);

    super.verbose(
      this.composeMessage(message, _options),
      _options.context ?? this.context,
      ...rest,
    );
  }

  warn(message: any): void;
  warn(message: any, options: LogMethodOptions): void;
  warn(message: any, ...optionalParams: any[]): void;
  warn(
    message: unknown,
    options: LogMethodOptions = {},
    ...rest: unknown[]
  ): void {
    const _options = this.getOptions(options);
    this.beforeLogging(message, _options);

    super.warn(
      this.composeMessage(message, _options),
      _options.context ?? this.context,
      ...rest,
    );
  }

  beforeLogging(message: any, options: LogMethodOptions) {
    this.options.event = this.options.event ?? {};
    this.invokePlugins(
      'onBeforeLogging',
      message,
      options,
      this._options.clsService,
    );
    void beforeLogging(message, options);
  }
}
