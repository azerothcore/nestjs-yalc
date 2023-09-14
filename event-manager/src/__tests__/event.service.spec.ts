import {
  jest,
  beforeEach,
  describe,
  expect,
  it,
  beforeAll,
} from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ImprovedLoggerService } from '@nestjs-yalc/logger/logger-abstract.service.js';
import { createMock } from '@golevelup/ts-jest';
import type { YalcEventService as EventServiceType } from '../event.service.js';

jest.unstable_mockModule('../event.js', async () => {
  return {
    eventLogAsync: jest.fn(),
    eventDebugAsync: jest.fn(),
    eventErrorAsync: jest.fn(),
    eventVerboseAsync: jest.fn(),
    eventWarnAsync: jest.fn(),
    eventException: jest.fn(),
    eventDebug: jest.fn(),
    eventError: jest.fn(),
    eventLog: jest.fn(),
    eventVerbose: jest.fn(),
    eventWarn: jest.fn(),
    event: jest.fn(),
    setGlobalEventEmitter: jest.fn(),
    getGlobalEventEmitter: jest.fn(),
    applyAwaitOption: (options) => options, // stupid workaround because of jest limitations with mocking esm modules
  };
});
const { YalcEventService } = await import('../event.service.js');
const {
  eventLogAsync,
  eventDebugAsync,
  eventErrorAsync,
  eventVerboseAsync,
  eventWarnAsync,
  eventDebug,
  eventError,
  eventLog,
  eventVerbose,
  eventWarn,
} = await import('../event.js');

describe('YalcEventService', () => {
  let service: EventServiceType;
  let mockLoggerService: Partial<ImprovedLoggerService>;
  let mockEventEmitter: Partial<EventEmitter2>;

  beforeAll(async () => {});

  beforeEach(async () => {
    mockLoggerService = createMock<ImprovedLoggerService>();

    mockEventEmitter = createMock<EventEmitter2>(new EventEmitter2());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: YalcEventService,
          useFactory: (
            loggerService: ImprovedLoggerService,
            eventEmitter: EventEmitter2,
          ) => {
            return new YalcEventService(loggerService, eventEmitter);
          },
          inject: ['INTERNAL_APP_LOGGER_SERVICE', EventEmitter2],
        },
        {
          provide: 'INTERNAL_APP_LOGGER_SERVICE',
          useValue: mockLoggerService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<EventServiceType>(YalcEventService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logger', () => {
    it('should return logger service', () => {
      expect(service.logger).toBe(mockLoggerService);
    });
  });

  describe('emitter', () => {
    it('should return event emitter', () => {
      expect(service.emitter).toBe(mockEventEmitter);
    });
  });

  describe('logAsync', () => {
    it('should call eventLogAsync with correct parameters', () => {
      service.logAsync('testEvent');
      expect(eventLogAsync).toHaveBeenCalledWith(
        'testEvent',
        expect.anything(),
      );
    });
  });

  describe('errorAsync', () => {
    it('should call eventErrorAsync with correct parameters', () => {
      service.errorAsync('testEvent');
      expect(eventErrorAsync).toHaveBeenCalledWith(
        'testEvent',
        expect.anything(),
      );
    });
  });

  describe('warnAsync', () => {
    it('should call eventWarnAsync with correct parameters', () => {
      service.warnAsync('testEvent');
      expect(eventWarnAsync).toHaveBeenCalledWith(
        'testEvent',
        expect.anything(),
      );
    });
  });

  describe('debugAsync', () => {
    it('should call eventDebugAsync with correct parameters', () => {
      service.debugAsync('testEvent');
      expect(eventDebugAsync).toHaveBeenCalledWith(
        'testEvent',
        expect.anything(),
      );
    });
  });

  describe('verboseAsync', () => {
    it('should call eventVerboseAsync with correct parameters', () => {
      service.verboseAsync('testEvent');
      expect(eventVerboseAsync).toHaveBeenCalledWith(
        'testEvent',
        expect.anything(),
      );
    });
  });

  describe('log', () => {
    it('should call eventLog with correct parameters', () => {
      service.log('testEvent');
      expect(eventLog).toHaveBeenCalledWith('testEvent', expect.anything());
    });
  });

  describe('error', () => {
    it('should call eventError with correct parameters', () => {
      service.error('testEvent');
      expect(eventError).toHaveBeenCalledWith('testEvent', expect.anything());
    });

    function getErrorMethods(instance: any): string[] {
      return Object.getOwnPropertyNames(Object.getPrototypeOf(instance)).filter(
        (methodName) =>
          methodName.startsWith('error') &&
          typeof instance[methodName] === 'function',
      );
    }

    const errorMethods = getErrorMethods(
      new YalcEventService({} as any, {} as any),
    );

    it.each(errorMethods)(
      'should call eventError with correct parameters for %s',
      (methodName) => {
        service[methodName]('testEvent');
        expect(eventError).toHaveBeenCalledWith('testEvent', expect.anything());
      },
    );
  });

  describe('warn', () => {
    it('should call eventWarn with correct parameters', () => {
      service.warn('testEvent');
      expect(eventWarn).toHaveBeenCalledWith('testEvent', expect.anything());
    });
  });

  describe('debug', () => {
    it('should call eventDebug with correct parameters', () => {
      service.debug('testEvent');
      expect(eventDebug).toHaveBeenCalledWith('testEvent', expect.anything());
    });
  });

  describe('verbose', () => {
    it('should call eventVerbose with correct parameters', () => {
      service.verbose('testEvent');
      expect(eventVerbose).toHaveBeenCalledWith('testEvent', expect.anything());
    });
  });

  describe('buildOptions', () => {
    it('should correctly merge options', () => {
      const options = service['buildOptions']({ event: false });
      expect(options).toEqual({ event: false, logger: expect.anything() });
    });

    it('should correctly merge options with logger false', () => {
      const options = service['buildOptions']({ event: false, logger: false });
      expect(options).toEqual({ event: false, logger: false });
    });
  });
});
