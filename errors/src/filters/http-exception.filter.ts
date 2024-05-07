import { GqlExceptionFilter } from '@nestjs/graphql';
import * as common from '@nestjs/common';
import {
  DefaultErrorMixin,
  MissingArgumentsError,
  isDefaultErrorMixin,
  formatCause,
} from '@nestjs-yalc/errors';
import {
  EntityError,
  isEntityError,
} from '@nestjs-yalc/crud-gen/entity.error.js';
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
          this.logger.log(error.message, {
            trace: error.stack,
          });
          break;

        case isDefaultErrorMixin(error):
          // no need to log, DefaultErrorMixin already logs
          break;

        /**
         * Log original error message (for now only if is an EntityError)
         * @todo refactor with the default error mixin
         */
        case isEntityError(error):
          {
            const entityError = error as EntityError;
            this.logger.error(
              entityError.originalError?.message
                ? entityError.originalError.message
                : error,
              entityError.originalError?.stack,
              {
                trace: entityError.originalError?.stack,
                data: {
                  response: entityError.getResponse(),
                  name: entityError.name,
                  cause: formatCause(entityError.cause),
                },
              },
            );
          }
          break;

        case isHttpError:
          {
            const httpError = error as common.HttpException;
            const logLevel = getLogLevelByStatus(httpError.getStatus());

            if (logLevel === LogLevelEnum.ERROR) {
              this.logger[logLevel](error.message, error.stack, {
                trace: httpError.stack,
                data: {
                  response: httpError.getResponse(),
                  name: error.name,
                  cause: formatCause(error.cause),
                },
              });
            } else {
              this.logger[logLevel](error.message, {
                trace: error.stack,
                data: {
                  response: httpError.getResponse(),
                  name: error.name,
                  cause: formatCause(error.cause),
                },
              });
            }
          }
          break;

        case error instanceof GqlError:
          this.logger.error((<GqlError>error).systemMessage ?? error.message);
          break;

        // Log critically any other error, as those are not expected
        default:
          this.logger.error(error.message, error.stack, {
            trace: error.stack,
            data: {
              cause: formatCause(error.cause),
              name: error.name,
            },
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
