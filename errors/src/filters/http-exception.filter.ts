import { GqlExceptionFilter } from '@nestjs/graphql';
import * as common from '@nestjs/common';
import {
  DefaultErrorMixin,
  MissingArgumentsError,
  isDefaultErrorMixin,
} from '@nestjs-yalc/errors';
import { ExceptionContextEnum } from '../error.enum.js';
import { EntityError } from '@nestjs-yalc/crud-gen/entity.error.js';
import { FastifyReply as FResponse } from 'fastify';
import { GqlError } from '@nestjs-yalc/graphql/plugins/gql.error.js';
import { BaseExceptionFilter } from '@nestjs/core';
import { getLogLevelByStatus } from '../../../event-manager/src/event.helper.js';
import { LogLevelEnum } from '@nestjs-yalc/logger/logger.enum.js';
import { type ImprovedLoggerService } from '@nestjs-yalc/logger/logger-abstract.service.js';

type HttpErrorType =
  | common.HttpException
  | MissingArgumentsError
  | GqlError
  | DefaultErrorMixin;
@common.Catch(
  common.HttpException,
  MissingArgumentsError,
  GqlError,
  DefaultErrorMixin,
)
export class HttpExceptionFilter
  extends BaseExceptionFilter
  implements GqlExceptionFilter, common.ExceptionFilter
{
  constructor(
    protected logger: ImprovedLoggerService,
    applicationRef?: common.HttpServer,
  ) {
    super(applicationRef);
  }

  catch(
    error: Error | HttpErrorType,
    host: common.ArgumentsHost,
    { sendResponse }: { sendResponse: boolean } = { sendResponse: true },
  ) {
    try {
      const isHttpError =
        this.isHttpError(error) || error instanceof common.HttpException;
      // TODO: Validate when monitoring is in place if we need an eventEmitter here instead of log
      switch (true) {
        // Base logging for normal operation execution errors
        case error instanceof MissingArgumentsError:
        case error instanceof common.UnauthorizedException: // Thrown by NestJS Auth Guard
          this.logger.log(error.message, {
            trace: error.stack,
          });
          break;

        // Log original error message (for now only if is an EntityError)
        case error instanceof EntityError:
          const entityError = error as EntityError;
          this.logger.error(
            entityError.originalError?.message
              ? entityError.originalError.message
              : error,
            ExceptionContextEnum.HTTP,
          );
          break;

        case error instanceof GqlError:
          this.logger.error((<GqlError>error).systemMessage ?? error.message);
          break;

        case isDefaultErrorMixin(error):
          // no need to log, DefaultErrorMixin already logs
          break;

        case isHttpError:
          const httpError = error as common.HttpException;
          const logLevel = getLogLevelByStatus(httpError.getStatus());

          if (logLevel === LogLevelEnum.ERROR) {
            this.logger[logLevel](error.message, error.stack, {
              trace: httpError.stack,
              data: httpError.getResponse(),
            });
          } else {
            this.logger[logLevel](error.message, {
              trace: error.stack,
              data: httpError.getResponse(),
            });
          }
          break;

        // Log critically any other error, as those are not expected
        default:
          this.logger.error(error.message, error.stack, {
            trace: error.stack,
          });
          break;
      }

      if (host.getType() === 'http') {
        if (sendResponse) {
          const ctx = host.switchToHttp();
          const response = ctx.getResponse<FResponse>();
          let status = common.HttpStatus.INTERNAL_SERVER_ERROR;
          if (isHttpError) status = (error as common.HttpException).getStatus();
          return response.status(status).send(error.message);
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e); // if there's an error with the logger itself
    }

    return error;
  }
}
