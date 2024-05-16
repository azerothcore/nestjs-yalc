import { describe, expect, it, jest } from "@jest/globals";
import { getLogLevelByStatus } from "../event.helper.js";
import { HttpStatus } from "@nestjs/common";

describe('EventHelper', () => {
  it('should return the correct log level', () => {
    expect(getLogLevelByStatus(HttpStatus.INTERNAL_SERVER_ERROR)).toBe('error');
    expect(getLogLevelByStatus(HttpStatus.TOO_MANY_REQUESTS)).toBe('warn');
    expect(getLogLevelByStatus(HttpStatus.BAD_REQUEST)).toBe('log');
    expect(getLogLevelByStatus(200)).toBe('log');
  });
})
