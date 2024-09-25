import { describe, expect, it } from '@jest/globals';

import {
  getHttpStatusDescription,
  getStatusCodeFromError,
} from '../http.helper.js';
import { BadRequestException, HttpStatus } from '@nestjs/common';

describe('Test http.helper.ts', () => {
  it('should run getHttpStatusDescription', () => {
    expect(getHttpStatusDescription(200)).toBe(
      '200: Request successful and response provided.',
    );
  });

  it('should work with the fallback', () => {
    expect(getHttpStatusDescription(999)).toBe('Unknown status code');
  });

  it('should run getStatusCodeFromError', () => {
    expect(getStatusCodeFromError(BadRequestException)).toBe(
      HttpStatus.BAD_REQUEST,
    );
  });

  it('should work with the fallback', () => {
    expect(getStatusCodeFromError(999)).toBe(null);
  });
});
