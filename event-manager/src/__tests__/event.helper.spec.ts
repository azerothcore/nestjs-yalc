import { describe, expect, it, jest } from '@jest/globals';
import { getLogLevelByStatus, isErrorEvent } from '../event.helper.js';
import { HttpException, HttpStatus } from '@nestjs/common';
import { DefaultError } from '@nestjs-yalc/errors/default.error.js';
import { LogLevelEnum } from '@nestjs-yalc/logger/logger.enum.js';

describe('EventHelper', () => {
  it('should return the correct log level', () => {
    expect(getLogLevelByStatus(HttpStatus.INTERNAL_SERVER_ERROR)).toBe('error');
    expect(getLogLevelByStatus(HttpStatus.TOO_MANY_REQUESTS)).toBe('warn');
    expect(getLogLevelByStatus(HttpStatus.BAD_REQUEST)).toBe('log');
    expect(getLogLevelByStatus(200)).toBe('log');
  });

  it('should return true if the event is an error event', () => {
    class CustomBadRequestException {
      getStatus() {
        return HttpStatus.BAD_REQUEST;
      }
    }

    class CustomInternalServerErrorException {
      getStatus() {
        return HttpStatus.INTERNAL_SERVER_ERROR;
      }
    }

    expect(isErrorEvent({})).toBeFalsy();
    expect(isErrorEvent({ errorClass: true })).toBeTruthy();
    expect(isErrorEvent({ errorClass: DefaultError })).toBeTruthy();
    expect(isErrorEvent({ errorClass: HttpException })).toBeTruthy();
    expect(isErrorEvent({ errorClass: Error })).toBeTruthy();
    expect(isErrorEvent({ errorClass: CustomBadRequestException })).toBeFalsy();
    expect(
      isErrorEvent({ errorClass: CustomInternalServerErrorException }),
    ).toBeTruthy();
    expect(
      isErrorEvent({ errorClass: new CustomBadRequestException() }),
    ).toBeFalsy();
    expect(
      isErrorEvent({ errorClass: new CustomInternalServerErrorException() }),
    ).toBeTruthy();
    expect(
      isErrorEvent({
        errorClass: new HttpException('test', HttpStatus.BAD_REQUEST),
      }),
    ).toBeFalsy();
    expect(
      isErrorEvent({
        errorClass: HttpException,
        logger: { level: LogLevelEnum.ERROR },
      }),
    ).toBeTruthy();
  });
});
