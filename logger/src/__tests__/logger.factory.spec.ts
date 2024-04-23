import {
  expect,
  jest,
  describe,
  it,
  beforeEach,
  beforeAll,
  afterAll,
  afterEach,
} from '@jest/globals';

class NestLogger {
  setLogLevels: jest.Mock<any>;
  static overrideLogger = jest.fn();
}

jest.mock('@nestjs/common', () => ({
  ...(jest.requireActual('@nestjs/common') as any),
  Logger: NestLogger,
}));

import { LogLevelEnum, LoggerTypeEnum } from '../logger.enum.js';
import { AppLoggerFactory } from '../logger.factory.js';
import { PinoLogger } from '../logger-pino.service.js';

describe('AppLoggerFactory', () => {
  // let mockConfigService;
  let logger;

  it('No configuration test', async () => {
    logger = AppLoggerFactory(
      'test',
      [LogLevelEnum.DEBUG],
      LoggerTypeEnum.CONSOLE,
    );
    expect(logger).toBeDefined();

    logger = AppLoggerFactory(
      'test',
      [LogLevelEnum.DEBUG],
      LoggerTypeEnum.PINO,
    );
    expect(logger).toBeDefined();
    expect(logger instanceof PinoLogger).toBeTruthy();

    logger = AppLoggerFactory(
      'test',
      [LogLevelEnum.DEBUG],
      LoggerTypeEnum.NEST,
    );
    expect(logger).toBeDefined();

    logger = AppLoggerFactory('test', [LogLevelEnum.DEBUG]);
    expect(logger).toBeDefined();

    logger = AppLoggerFactory('test', []);
    expect(logger).toBeDefined();
  });

  it('No configuration test', async () => {
    logger = AppLoggerFactory('test');
    expect(logger).toBeDefined();

    NestLogger.prototype.setLogLevels = jest.fn();

    logger = AppLoggerFactory('test', [LogLevelEnum.DEBUG]);
    expect(logger).toBeDefined();
  });
});
