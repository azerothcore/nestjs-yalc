import { describe, expect, it } from '@jest/globals';

import { getHttpStatusDescription } from '../http.helper.js';

describe('Test http.helper.ts', () => {
  it('should run getHttpStatusDescription', () => {
    expect(getHttpStatusDescription(200)).toBe(
      '200: Request successful and response provided.',
    );
  });

  it('should work with the fallback', () => {
    expect(getHttpStatusDescription(999)).toBe('Unknown status code');
  });
});
