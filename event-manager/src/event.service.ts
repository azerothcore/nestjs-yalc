import { Injectable, LogLevel } from '@nestjs/common';
import {
  eventLogAsync,
  eventDebugAsync,
  eventErrorAsync,
  eventVerboseAsync,
  eventWarnAsync,
  IEventOptions,
  eventDebug,
  eventError,
  eventLog,
  eventVerbose,
  eventWarn,
  applyAwaitOption,
  IErrorEventOptions,
  isErrorOptions,
  IErrorEventOptionsRequired,
} from './event.js';
import { LogLevelEnum, type ImprovedLoggerService } from '@nestjs-yalc/logger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventNameFormatter } from './emitter.js';
import {
  DefaultError,
  errorToDefaultError,
} from '@nestjs-yalc/errors/default.error.js';
import {
  BadGatewayError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  GatewayTimeoutError,
  GoneError,
  InternalServerError,
  MethodNotAllowedError,
  NotAcceptableError,
  NotFoundError,
  NotImplementedError,
  PaymentRequiredError,
  ServiceUnavailableError,
  TooManyRequestsError,
  UnauthorizedError,
  UnprocessableEntityError,
  UnsupportedMediaTypeError,
} from '@nestjs-yalc/errors/error.class.js';
import { getLogLevelByStatus } from './event.helper.js';
import { ClassType } from '@nestjs-yalc/types/globals.d.js';
import { HttpStatusCodes } from '@nestjs-yalc/utils/http.helper.js';
import { httpStatusCodeToErrors } from '@nestjs-yalc/errors/http-status-code-to-errors.js';

export interface IEventServiceOptions<
  TFormatter extends EventNameFormatter = EventNameFormatter,
> {
  formatter?: TFormatter;
}

/**
 * Decorator to inject a trace into the options object if it's not already set.
 * This approach reduces the amount of non-essential trace lines in the code.
 */
function InjectTrace() {
  return function (_target: any, _key: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      // Assuming the options object is the second argument (index 1)
      let options: IErrorEventOptions = args[1] as IErrorEventOptions;

      // Ensure options is an object, and set the trace if not present
      if (typeof options !== 'object' || options === null) {
        options = {};
        args[1] = options;
      }

      // Set trace if it's not already set
      if (!options.trace && !(options.errorClass as DefaultError)?.stack) {
        options.trace = new Error().stack;
      }

      // Call the original method with possibly modified arguments
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

@Injectable()
export class YalcEventService<
  TFormatter extends EventNameFormatter = EventNameFormatter,
  TEventOptions extends IEventOptions<TFormatter> = IEventOptions<TFormatter>,
  TErrorOptions extends IErrorEventOptions<TFormatter> = IErrorEventOptions<TFormatter>,
> {
  constructor(
    protected readonly loggerService: ImprovedLoggerService,
    protected readonly eventEmitter: EventEmitter2,
    protected options?: IEventServiceOptions<TFormatter>,
  ) {}

  get logger(): ImprovedLoggerService {
    return this.loggerService;
  }

  get emitter(): EventEmitter2 {
    return this.eventEmitter;
  }

  /**
   * Alias for log
   */
  emit = this.log;
  emitAsync = this.logAsync;

  @InjectTrace()
  public error<TOpts extends IErrorEventOptions<TFormatter>>(
    eventName: Parameters<TFormatter> | string,
    options?: TOpts,
  ) {
    return eventError<TFormatter, TOpts>(
      eventName,
      this.buildOptions<TOpts>(options),
    );
  }

  public async logAsync(
    eventName: Parameters<TFormatter> | string,
    options?: TEventOptions,
  ): Promise<any> {
    return eventLogAsync(eventName, this.buildOptions(options));
  }

  @InjectTrace()
  public async errorAsync<TOpts extends IErrorEventOptions<TFormatter>>(
    eventName: Parameters<TFormatter> | string,
    options?: TOpts,
  ) {
    return eventErrorAsync<TFormatter, TOpts>(
      eventName,
      this.buildOptions<TOpts>(options),
    );
  }

  public async warnAsync(
    eventName: Parameters<TFormatter> | string,
    options?: TEventOptions,
  ): Promise<any> {
    return eventWarnAsync(eventName, this.buildOptions(options));
  }

  public async debugAsync(
    eventName: Parameters<TFormatter> | string,
    options?: TEventOptions,
  ): Promise<any> {
    return eventDebugAsync(eventName, this.buildOptions(options));
  }

  public async verboseAsync(
    eventName: Parameters<TFormatter> | string,
    options?: TEventOptions,
  ): Promise<any> {
    return eventVerboseAsync(eventName, this.buildOptions(options));
  }

  public log(
    eventName: Parameters<TFormatter> | string,
    options?: TEventOptions,
  ): any {
    return eventLog(eventName, this.buildOptions(options));
  }

  public warn(
    eventName: Parameters<TFormatter> | string,
    options?: TEventOptions,
  ): any {
    return eventWarn(eventName, this.buildOptions(options));
  }

  public debug(
    eventName: Parameters<TFormatter> | string,
    options?: TEventOptions,
  ): any {
    return eventDebug(eventName, this.buildOptions(options));
  }

  public verbose(
    eventName: Parameters<TFormatter> | string,
    options?: TEventOptions,
  ): any {
    return eventVerbose(eventName, this.buildOptions(options));
  }

  /**
   * Use this method to throw an error with arbitrary status code. 500 by default.
   */
  public errorHttp(
    eventName: Parameters<TFormatter> | string,
    errorCode: number,
    options?: TErrorOptions,
  ): any {
    const httpCode: HttpStatusCodes = errorCode;
    const selectedError =
      httpStatusCodeToErrors[httpCode] ?? InternalServerError;
    const mergedOptions = this.applyLoggerLevel(
      applyAwaitOption(this.buildErrorOptions(options, selectedError)),
      getLogLevelByStatus(errorCode),
    );
    return this.error(eventName, mergedOptions);
  }

  public errorForward(
    eventName: Parameters<TFormatter> | string,
    error: Error | DefaultError,
    options?: TErrorOptions,
  ): any {
    const mergedOptions = this.applyLoggerLevelWarn(
      applyAwaitOption(this.buildErrorOptions(options)),
    );
    return this.error(eventName, {
      ...mergedOptions,
      errorClass: errorToDefaultError(error),
    });
  }

  /**
   * Use this method to throw a 400 Bad Request error when the request could not be understood or was missing required parameters.
   */
  @InjectTrace()
  public errorBadRequest(
    eventName: Parameters<TFormatter> | string,
    options?: Omit<TErrorOptions, 'errorClass'>,
  ): BadRequestError {
    const mergedOptions = this.applyLoggerLevelLog(
      applyAwaitOption(this.buildErrorOptions(options, BadRequestError)),
    );
    return this.error(eventName, mergedOptions);
  }

  /**
   * Use this method to throw a 401 Unauthorized error when authentication is required and has failed or has not yet been provided.
   */
  @InjectTrace()
  public errorUnauthorized(
    eventName: Parameters<TFormatter> | string,
    options?: Omit<TErrorOptions, 'errorClass'>,
  ): UnauthorizedError {
    const mergedOptions = this.applyLoggerLevelLog(
      applyAwaitOption(this.buildErrorOptions(options, UnauthorizedError)),
    );
    return this.error(eventName, mergedOptions);
  }

  /**
   * Use this method to throw a 402 Payment Required error. This status code is reserved for future use.
   */
  @InjectTrace()
  public errorPaymentRequired(
    eventName: Parameters<TFormatter> | string,
    options?: Omit<TErrorOptions, 'errorClass'>,
  ): PaymentRequiredError {
    const mergedOptions = this.applyLoggerLevelLog(
      applyAwaitOption(this.buildErrorOptions(options, PaymentRequiredError)),
    );
    return this.error(eventName, mergedOptions);
  }

  /**
   * Use this method to throw a 403 Forbidden error when the client does not have access rights to the content.
   */
  @InjectTrace()
  public errorForbidden(
    eventName: Parameters<TFormatter> | string,
    options?: Omit<TErrorOptions, 'errorClass'>,
  ): ForbiddenError {
    const mergedOptions = this.applyLoggerLevelLog(
      applyAwaitOption(this.buildErrorOptions(options, ForbiddenError)),
    );
    return this.error(eventName, mergedOptions);
  }

  /**
   * Use this method to throw a 404 Not Found error when the server can not find the requested resource.
   */
  @InjectTrace()
  public errorNotFound(
    eventName: Parameters<TFormatter> | string,
    options?: Omit<TErrorOptions, 'errorClass'>,
  ): NotFoundError {
    const mergedOptions = this.applyLoggerLevelLog(
      applyAwaitOption(this.buildErrorOptions(options, NotFoundError)),
    );
    return this.error(eventName, mergedOptions);
  }

  /**
   * Use this method to throw a 405 Method Not Allowed error when the HTTP method is not supported for the requested resource.
   */
  @InjectTrace()
  public errorMethodNotAllowed(
    eventName: Parameters<TFormatter> | string,
    options?: Omit<TErrorOptions, 'errorClass'>,
  ): MethodNotAllowedError {
    const mergedOptions = this.applyLoggerLevelLog(
      applyAwaitOption(this.buildErrorOptions(options, MethodNotAllowedError)),
    );
    return this.error(eventName, mergedOptions);
  }

  /**
   * Use this method to throw a 406 Not Acceptable error when the server cannot produce a response matching the list of acceptable values defined in the request's headers.
   */
  @InjectTrace()
  public errorNotAcceptable(
    eventName: Parameters<TFormatter> | string,
    options?: Omit<TErrorOptions, 'errorClass'>,
  ): NotAcceptableError {
    const mergedOptions = this.applyLoggerLevelLog(
      applyAwaitOption(this.buildErrorOptions(options, NotAcceptableError)),
    );
    return this.error(eventName, mergedOptions);
  }

  /**
   * Use this method to throw a 409 Conflict error when the request could not be completed due to a conflict with the current state of the target resource.
   */
  @InjectTrace()
  public errorConflict(
    eventName: Parameters<TFormatter> | string,
    options?: Omit<TErrorOptions, 'errorClass'>,
  ): ConflictError {
    const mergedOptions = this.applyLoggerLevelLog(
      applyAwaitOption(this.buildErrorOptions(options, ConflictError)),
    );
    return this.error(eventName, mergedOptions);
  }

  /**
   * Use this method to throw a 410 Gone error when the target resource is no longer available at the origin server and no forwarding address is known.
   */
  @InjectTrace()
  public errorGone(
    eventName: Parameters<TFormatter> | string,
    options?: Omit<TErrorOptions, 'errorClass'>,
  ): GoneError {
    const mergedOptions = this.applyLoggerLevelLog(
      applyAwaitOption(this.buildErrorOptions(options, GoneError)),
    );
    return this.error(eventName, mergedOptions);
  }

  /**
   * Use this method to throw a 415 Unsupported Media Type error when the request entity has a media type which the server or resource does not support.
   */
  @InjectTrace()
  public errorUnsupportedMediaType(
    eventName: Parameters<TFormatter> | string,
    options?: Omit<TErrorOptions, 'errorClass'>,
  ): UnsupportedMediaTypeError {
    const mergedOptions = this.applyLoggerLevelLog(
      applyAwaitOption(
        this.buildErrorOptions(options, UnsupportedMediaTypeError),
      ),
    );
    return this.error(eventName, mergedOptions);
  }

  /**
   * Use this method to throw a 422 Unprocessable Entity error when the server understands the content type of the request entity, but was unable to process the contained instructions.
   */
  @InjectTrace()
  public errorUnprocessableEntity(
    eventName: Parameters<TFormatter> | string,
    options?: Omit<TErrorOptions, 'errorClass'>,
  ): UnprocessableEntityError {
    const mergedOptions = this.applyLoggerLevelLog(
      applyAwaitOption(
        this.buildErrorOptions(options, UnprocessableEntityError),
      ),
    );
    return this.error(eventName, mergedOptions);
  }

  /**
   * Use this method to throw a 429 Too Many Requests error when the user has sent too many requests in a given amount of time.
   */
  @InjectTrace()
  public errorTooManyRequests(
    eventName: Parameters<TFormatter> | string,
    options?: Omit<TErrorOptions, 'errorClass'>,
  ): TooManyRequestsError {
    const mergedOptions = this.applyLoggerLevelWarn(
      applyAwaitOption(this.buildErrorOptions(options, TooManyRequestsError)),
    );
    return this.error(eventName, mergedOptions);
  }

  /**
   * Use this method to throw a 500 Internal Server Error when the server encountered an unexpected condition that prevented it from fulfilling the request.
   */
  @InjectTrace()
  public errorInternalServerError(
    eventName: Parameters<TFormatter> | string,
    options?: Omit<TErrorOptions, 'errorClass'>,
  ): InternalServerError {
    const mergedOptions = applyAwaitOption(
      this.buildErrorOptions(options, InternalServerError),
    );
    return this.error(eventName, mergedOptions);
  }

  /**
   * Use this method to throw a 501 Not Implemented error when the server does not support the functionality required to fulfill the request.
   */
  @InjectTrace()
  public errorNotImplemented(
    eventName: Parameters<TFormatter> | string,
    options?: Omit<TErrorOptions, 'errorClass'>,
  ): NotImplementedError {
    const mergedOptions = applyAwaitOption(
      this.buildErrorOptions(options, NotImplementedError),
    );
    return this.error(eventName, mergedOptions);
  }

  /**
   * Use this method to throw a 502 Bad Gateway error when one server on the internet received an invalid response from another server.
   */
  @InjectTrace()
  public errorBadGateway(
    eventName: Parameters<TFormatter> | string,
    options?: Omit<TErrorOptions, 'errorClass'>,
  ): BadGatewayError {
    const mergedOptions = applyAwaitOption(
      this.buildErrorOptions(options, BadGatewayError),
    );
    return this.error(eventName, mergedOptions);
  }

  /**
   * Use this method to throw a 503 Service Unavailable error when the server is not ready to handle the request. Common causes are a server that is down for maintenance or that is overloaded.
   */
  @InjectTrace()
  public errorServiceUnavailable(
    eventName: Parameters<TFormatter> | string,
    options?: Omit<TErrorOptions, 'errorClass'>,
  ): ServiceUnavailableError {
    const mergedOptions = applyAwaitOption(
      this.buildErrorOptions(options, ServiceUnavailableError),
    );
    return this.error(eventName, mergedOptions);
  }

  /**
   * Use this method to throw a 504 Gateway Timeout error when one server did not receive a timely response from another server or some other auxiliary server it needed to access to complete the request.
   */
  @InjectTrace()
  public errorGatewayTimeout(
    eventName: Parameters<TFormatter> | string,
    options?: Omit<TErrorOptions, 'errorClass'>,
  ): any {
    const mergedOptions = applyAwaitOption(
      this.buildErrorOptions(options, GatewayTimeoutError),
    );
    return this.error(eventName, mergedOptions);
  }

  protected applyLoggerLevel<
    TOpt extends IEventOptions<TFormatter> | IErrorEventOptions<TFormatter>,
  >(options: TOpt, level: LogLevel): TOpt {
    if (options?.logger === false) return options;

    return {
      ...options,
      logger: {
        ...options?.logger,
        level,
      },
    } as TOpt;
  }

  protected applyLoggerLevelWarn<
    TOpts extends IErrorEventOptions<TFormatter> | IEventOptions<TFormatter>,
  >(options: TOpts): TOpts {
    return this.applyLoggerLevel(options, LogLevelEnum.WARN);
  }

  protected applyLoggerLevelLog<
    TOpts extends IErrorEventOptions<TFormatter> | IEventOptions<TFormatter>,
  >(options: TOpts): TOpts {
    return this.applyLoggerLevel(options, LogLevelEnum.LOG);
  }

  /**
   * Merges the methods options with the constructor options.
   */
  protected buildOptions<
    TOpts extends IErrorEventOptions<TFormatter> | IEventOptions<TFormatter>,
  >(options?: TOpts): TOpts {
    const _options: TOpts = { ...(options as TOpts) };

    let event: IEventOptions<TFormatter>['event'];
    if (_options?.event !== undefined || this.eventEmitter) {
      event =
        _options.event === false
          ? false
          : {
              ..._options?.event,
              emitter: _options?.event?.emitter ?? this.eventEmitter,
              formatter: _options?.event?.formatter ?? this.options?.formatter,
            };
    }

    if (isErrorOptions(_options)) {
      const errorOptions = _options as IErrorEventOptions;
      errorOptions.errorClass ??= DefaultError;
      errorOptions.trace ??= new Error().stack;
    }

    const res: IErrorEventOptions<TFormatter> = {
      ..._options,
      event,
      logger:
        _options?.logger === false
          ? false
          : {
              ..._options?.logger,
              instance: this.loggerService,
            },
    };

    return res as TOpts;
  }

  protected buildErrorOptions<TErrorClass extends DefaultError = DefaultError>(
    options: IErrorEventOptions<TFormatter> = {},
    defaultClass: ClassType<TErrorClass> | boolean = true,
  ): IErrorEventOptionsRequired<TFormatter, TErrorClass> {
    options.errorClass ??= defaultClass;
    return options as IErrorEventOptionsRequired<TFormatter, TErrorClass>;
  }
}
