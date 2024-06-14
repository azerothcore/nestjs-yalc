import { LogLevel } from '@nestjs/common';
import { type ImprovedLoggerService } from '@nestjs-yalc/logger/logger-abstract.service.js';
import { LogLevelEnum } from '@nestjs-yalc/logger/logger.enum.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { maskDataInObject } from '@nestjs-yalc/logger/logger.helper.js';
import {
  DefaultError,
  ILogErrorPayload,
  IErrorPayload,
  isDefaultErrorMixin,
} from '@nestjs-yalc/errors/default.error.js';
import { EventNameFormatter, emitEvent, formatName } from './emitter.js';
import { ClassType, InstanceType } from '@nestjs-yalc/types/globals.d.js';
import { getYalcGlobalEventEmitter } from './global-emitter.js';
import { AppLoggerFactory } from '@nestjs-yalc/logger/logger.factory.js';
import { isClass } from '@nestjs-yalc/utils/class.helper.js';
import { deepMergeWithoutArrayConcat } from '@nestjs-yalc/utils/object.helper.js';

interface IEventEmitterOptions<
  TFormatter extends EventNameFormatter = EventNameFormatter,
> {
  emitter?: EventEmitter2;
  formatter?: TFormatter;
  await?: boolean;
}

export interface IDataInfo {
  [key: string]: any;
  /**
   * We know that eventName is always added to the data object
   */
  eventName: string;
}

export interface IEventPayload {
  message?: string;
  /**
   * The data is the place where you want to add the extra information
   * that are not returned back as a response but they can be sent to the logger or the event emitter.
   */
  data?: IDataInfo;
  eventName: string;
  errorInfo?: IErrorPayload;
}

export interface IEventOptions<
  TFormatter extends EventNameFormatter = EventNameFormatter,
> {
  /**
   * The data is the place where you want to add the extra information
   * that are not returned back as a response but they can be sent to the logger or the event emitter.
   */
  data?: any;
  /**
   * This can be used to log the configuration values of the event.
   * This might be helpful to filter the logs based on extra configuration values
   * that are not the basic error level, statusCode etc.
   */
  config?: any;
  mask?: string[];
  event?: IEventEmitterOptions<TFormatter> | false;
  message?: string;
  stack?: string;
  logger?:
    | { instance?: ImprovedLoggerService; level?: LogLevel }
    | LogLevel
    | false;
  /**
   * This is used to trigger the same event with different names.
   */
  eventAliases?: string[];
}

export interface IErrorEventOptions<
  TFormatter extends EventNameFormatter = EventNameFormatter,
  TErrorClass extends DefaultError = DefaultError,
> extends IEventOptions<TFormatter>,
    Omit<IErrorPayload, 'internalMessage' | 'data'> {
  /**
   * If set to false or undefined, the error will not be thrown.
   * If set to true, the error will be thrown with the default error class.
   * If set to a class, the error will be thrown with the provided class.
   */
  errorClass?: ClassType<TErrorClass> | TErrorClass | boolean;
}

export interface IErrorEventOptionsRequired<
  TFormatter extends EventNameFormatter = EventNameFormatter,
  TErrorClass extends DefaultError = DefaultError,
> extends Omit<IErrorEventOptions<TFormatter, TErrorClass>, 'errorClass'>,
    Required<Pick<IErrorEventOptions<TFormatter, TErrorClass>, 'errorClass'>> {}

export function applyAwaitOption<
  TFormatter extends EventNameFormatter = EventNameFormatter,
  TOpts extends
    | IErrorEventOptions<TFormatter>
    | IEventOptions<TFormatter> = IEventOptions<TFormatter>,
>(options?: TOpts): TOpts {
  let event = options?.event;
  if (event !== false && event !== undefined) {
    event = { ...event, await: event.await ?? true };
  }
  return { ...options, event } as TOpts;
}

type ReturnType<T> = T extends { errorClass: false }
  ? boolean | any[] | undefined
  : Error | DefaultError;

type PickError<
  TFormatter extends EventNameFormatter = EventNameFormatter,
  TOpt extends IErrorEventOptions<TFormatter> = IErrorEventOptions<TFormatter>,
> = NonNullable<
  TOpt extends { errorClass: infer T }
    ? T extends boolean
      ? DefaultError
      : InstanceType<T>
    : never
>;

type eventErrorReturnType<
  TFormatter extends EventNameFormatter = EventNameFormatter,
  TOpt extends IErrorEventOptions<TFormatter> = IErrorEventOptions<TFormatter>,
> = TOpt extends {
  errorClass: false;
}
  ? TOpt extends { await: true }
    ? Promise<boolean | any[] | undefined>
    : boolean | any[] | undefined
  : TOpt extends { await: true }
  ? Promise<PickError<TFormatter, TOpt>>
  : PickError<TFormatter, TOpt>;

type eventErrorReturnTypeAsync<
  TFormatter extends EventNameFormatter = EventNameFormatter,
  TOpt extends IErrorEventOptions<TFormatter> = IErrorEventOptions<TFormatter>,
> = Promise<
  TOpt extends {
    errorClass: false;
  }
    ? boolean | any | undefined
    : PickError<TFormatter, TOpt>
>;

export function isErrorOptions(
  options?: IEventOptions | IErrorEventOptions,
): options is IErrorEventOptions {
  return (options as IErrorEventOptions)?.errorClass !== undefined;
}

export function event<
  TFormatter extends EventNameFormatter = EventNameFormatter,
  TOption extends
    | IEventOptions<TFormatter>
    | IErrorEventOptions<TFormatter> = IEventOptions<TFormatter>,
>(
  eventName: Parameters<TFormatter> | string,
  options?: TOption,
): Promise<ReturnType<TOption>> | ReturnType<TOption> {
  const { data: _data, event, logger, mask, stack, config } = options ?? {};
  let receivedData = _data;

  const formattedEventName = formatName(
    eventName,
    options?.event ? options?.event?.formatter : undefined,
  );

  if (typeof receivedData === 'string') {
    receivedData = { message: receivedData };
  }

  if (mask) receivedData = maskDataInObject(receivedData, mask);
  const data: IDataInfo = { ...receivedData, eventName: formattedEventName };

  const optionalMessage = options?.logger ? options.message : undefined;

  /**
   *
   * ERROR
   *
   */
  let errorInstance;
  let errorPayload: ILogErrorPayload = {};
  if (isErrorOptions(options)) {
    const { errorClass: _class, ...rest } = options;

    if (_class !== false && _class !== undefined) {
      if (isClass(_class) || _class === true) {
        let _errorClass: ClassType<DefaultError>;
        const errorOptions = rest;
        if (_class === true) {
          _errorClass = DefaultError;
        } else {
          _errorClass = _class;
        }

        /**
         * We build the message here.
         */
        const message = optionalMessage ?? formattedEventName;

        errorInstance = new _errorClass(message, {
          eventName: formattedEventName,
          ...errorOptions,
          eventEmitter: false,
          logger: false,
        }) as ReturnType<TOption>;
      } else {
        errorInstance = _class as ReturnType<TOption>;
      }

      if (isDefaultErrorMixin(errorInstance)) {
        errorInstance.setPayload({
          ...errorInstance.getEventPayload(),
          data: deepMergeWithoutArrayConcat(
            errorInstance.getEventPayload().data,
            receivedData,
          ),
        });
        errorPayload = errorInstance.getEventPayload();
      } else {
        errorPayload = {
          ...(errorInstance as any),
          data: deepMergeWithoutArrayConcat(
            (errorInstance as any).data ?? {},
            receivedData,
          ),
          config,
        };
      }
    }
  }

  /**
   *
   * LOGGER
   *
   * We build the logger function here unless the logger is false
   */
  if (logger !== false) {
    const {
      instance: _instance,
      level: _level,
      ...rest
    } = logger && typeof logger !== 'string'
      ? logger
      : { level: logger, instance: undefined };

    const { level, instance } = {
      instance: _instance ?? AppLoggerFactory('Event'),
      level: _level ?? 'log',
      ...rest,
    };

    const message = optionalMessage ?? formattedEventName;

    if (level === 'error') {
      instance.error(message, stack ?? errorPayload?.stack, {
        data: { ...data, ...errorPayload },
        event: false,
        config,
        stack: stack ?? errorPayload?.stack,
      });
    } else {
      instance[level]?.(message, {
        data: { ...data, ...errorPayload },
        event: false,
        config,
        stack: stack ?? errorPayload?.stack,
      });
    }
  }

  /**
   *
   * EVENT
   *
   * We emit the event here unless the event is false
   */
  let result;
  const toAwait: Promise<any>[] = [];
  if (event !== false) {
    const eventEmitter = event?.emitter ?? getYalcGlobalEventEmitter();
    const formatter = event?.formatter;

    const eventPayload: IEventPayload = {
      message: optionalMessage,
      data,
      eventName: formattedEventName,
      errorInfo:
        Object.keys(errorPayload).length > 0 ? errorPayload : undefined,
    };

    result = emitEvent<TFormatter>(eventEmitter, eventName, eventPayload, {
      formatter,
      await: event?.await,
    });

    if (options?.eventAliases) {
      toAwait.push(
        ...options.eventAliases.map((alias) =>
          emitEvent<TFormatter>(eventEmitter, alias, eventPayload, {
            formatter,
            await: event?.await,
          }),
        ),
      );
    }
  }

  return (
    errorInstance ??
    (async () => {
      await Promise.all(toAwait);
      return result as Promise<ReturnType<TOption>>;
    })()
  );
}

export function getLoggerOption(level: LogLevel, options?: IEventOptions) {
  if (options?.logger === false) return false;

  if (typeof options?.logger === 'string') {
    return { level: options.logger };
  }

  return { level, ...options?.logger };
}

export function resolveLoggerOption(logger: IEventOptions['logger']) {
  if (logger === false) return false;

  if (typeof logger === 'string') {
    return { level: logger };
  }

  return logger;
}

export async function eventLogAsync<
  TFormatter extends EventNameFormatter = EventNameFormatter,
>(
  eventName: Parameters<TFormatter> | string,
  options?: IEventOptions<TFormatter>,
): Promise<any> {
  const _options = applyAwaitOption<TFormatter>(options);
  return event(eventName, {
    ..._options,
    logger: getLoggerOption(LogLevelEnum.LOG, _options),
  });
}

export function eventLog<
  TFormatter extends EventNameFormatter = EventNameFormatter,
>(
  eventName: Parameters<TFormatter> | string,
  options?: IEventOptions<TFormatter>,
): any {
  return event(eventName, {
    ...options,
    logger: getLoggerOption(LogLevelEnum.LOG, options),
  });
}

export async function eventErrorAsync<
  TFormatter extends EventNameFormatter = EventNameFormatter,
  TOption extends IErrorEventOptions<TFormatter> = IEventOptions<TFormatter>,
>(
  eventName: Parameters<TFormatter> | string,
  options?: TOption,
): eventErrorReturnTypeAsync<TFormatter, TOption> {
  const _options = applyAwaitOption<TFormatter, TOption>(options);
  return eventError<TFormatter, TOption>(
    eventName,
    _options,
  ) as unknown as eventErrorReturnTypeAsync<TFormatter, TOption>;
}

export function eventError<
  TFormatter extends EventNameFormatter = EventNameFormatter,
  TOption extends IErrorEventOptions<TFormatter> = IErrorEventOptions<TFormatter>,
>(
  eventName: Parameters<TFormatter> | string,
  options?: TOption,
): eventErrorReturnType<TFormatter, TOption> {
  const _options: IErrorEventOptionsRequired<TFormatter> = {
    ...(options ?? {}),
    logger: getLoggerOption(LogLevelEnum.ERROR, options),
    errorClass: options?.errorClass ?? true,
  };
  return event<TFormatter>(
    eventName,
    _options,
  ) as unknown as eventErrorReturnType<TFormatter, TOption>;
}

export async function eventWarnAsync<
  TFormatter extends EventNameFormatter = EventNameFormatter,
>(
  eventName: Parameters<TFormatter> | string,
  options?: IEventOptions<TFormatter>,
): Promise<any> {
  const _options = applyAwaitOption<TFormatter>(options);
  return event(eventName, {
    ..._options,
    logger: getLoggerOption(LogLevelEnum.WARN, _options),
  });
}

export function eventWarn<
  TFormatter extends EventNameFormatter = EventNameFormatter,
>(
  eventName: Parameters<TFormatter> | string,
  options?: IEventOptions<TFormatter>,
): any {
  return event(eventName, {
    ...options,
    logger: getLoggerOption(LogLevelEnum.WARN, options),
  });
}

export async function eventDebugAsync<
  TFormatter extends EventNameFormatter = EventNameFormatter,
>(
  eventName: Parameters<TFormatter> | string,
  options?: IEventOptions<TFormatter>,
): Promise<any> {
  const _options = applyAwaitOption<TFormatter>(options);
  return event(eventName, {
    ..._options,
    logger: getLoggerOption(LogLevelEnum.DEBUG, _options),
  });
}

export function eventDebug<
  TFormatter extends EventNameFormatter = EventNameFormatter,
>(
  eventName: Parameters<TFormatter> | string,
  options?: IEventOptions<TFormatter>,
): any {
  return event(eventName, {
    ...options,
    logger: getLoggerOption(LogLevelEnum.DEBUG, options),
  });
}

export async function eventVerboseAsync<
  TFormatter extends EventNameFormatter = EventNameFormatter,
>(
  eventName: Parameters<TFormatter> | string,
  options?: IEventOptions<TFormatter>,
): Promise<any> {
  const _options = applyAwaitOption<TFormatter>(options);
  return event(eventName, {
    ..._options,
    logger: getLoggerOption(LogLevelEnum.VERBOSE, _options),
  });
}

export function eventVerbose<
  TFormatter extends EventNameFormatter = EventNameFormatter,
>(
  eventName: Parameters<TFormatter> | string,
  options?: IEventOptions<TFormatter>,
): any {
  return event(eventName, {
    ...options,
    logger: getLoggerOption(LogLevelEnum.VERBOSE, options),
  });
}
