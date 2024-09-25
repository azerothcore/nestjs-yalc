import { expect, describe, it } from '@jest/globals';
import {
  getHttpStatusDescription,
  HttpStatusCodes,
} from '@nestjs-yalc/utils/http.helper.js';
import { HttpException } from '@nestjs/common';
import { AdditionalVerificationNeededError } from '../index.js';

describe('Verification error', () => {
  const error = new AdditionalVerificationNeededError();

  it('should be defined', () => {
    expect(error).toBeDefined();
  });

  it('should have the correct message and code', () => {
    expect(error.description).toEqual(
      getHttpStatusDescription(HttpStatusCodes.UnavailableForLegalReasons),
    );
    expect(error.getStatus()).toEqual(
      HttpStatusCodes.UnavailableForLegalReasons,
    );
  });

  it('should be an instance of HttpException', () => {
    expect(error).toBeInstanceOf(HttpException);
  });
});
