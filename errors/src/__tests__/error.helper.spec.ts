import { describe, expect, it } from '@jest/globals';
import { getStatusCodeFromError } from '../error.helper.js';
import { BadRequestException, HttpStatus } from '@nestjs/common';
import { BadRequestError } from '../error.class.js';

describe('ErrorHelper', () => {
  it('should return the correct status code', () => {
    expect(getStatusCodeFromError(BadRequestError)).toBe(
      HttpStatus.BAD_REQUEST,
    );

    expect(getStatusCodeFromError(new BadRequestError())).toBe(
      HttpStatus.BAD_REQUEST,
    );

    expect(getStatusCodeFromError(new Error())).toBe(null);
    expect(getStatusCodeFromError(Error)).toBe(null);

    expect(getStatusCodeFromError(BadRequestException)).toBe(
      HttpStatus.BAD_REQUEST,
    );
  });
});
