import { describe, it, expect } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { ImprovedLoggerService } from '@nestjs-yalc/logger/logger-abstract.service.js';
import { AppLoggerFactory, ImprovedNestLogger } from '@nestjs-yalc/logger';
import {
  EventModule,
  EVENT_LOGGER,
  OPTION_PROVIDER,
  ILoggerProviderOptionsObject,
} from '../event.module.js';
import { YalcEventService } from '../event.service.js';
import { Logger } from '@nestjs/common';

describe('EventModule', () => {
  it('should provide YalcEventService', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [EventModule.forRootAsync(), EventEmitterModule.forRoot()],
    }).compile();

    const eventService = moduleRef.get<YalcEventService>(YalcEventService);
    expect(eventService).toBeDefined();
  });

  it('should provide custom logger', async () => {
    const logger = new ImprovedNestLogger('test', {});
    const moduleRef = await Test.createTestingModule({
      imports: [
        EventModule.forRootAsync({ loggerProvider: logger }),
        EventEmitterModule.forRoot(),
      ],
    }).compile();

    const providedLogger = moduleRef.get<ImprovedLoggerService>(EVENT_LOGGER);
    expect(providedLogger).toBeInstanceOf(ImprovedNestLogger);
  });

  it('should provide custom emitter', async () => {
    const emitter = new EventEmitter2();
    const moduleRef = await Test.createTestingModule({
      imports: [
        EventModule.forRootAsync({
          eventEmitter: { provide: EventEmitter2, useValue: emitter },
        }),
        EventEmitterModule.forRoot(),
      ],
    }).compile();

    const providedEmitter = moduleRef.get<EventEmitter2>(EventEmitter2);
    expect(providedEmitter).toBeInstanceOf(EventEmitter2);
  });

  it('should provide logger from factory if loggerProvider is an object', async () => {
    const loggerProvider: ILoggerProviderOptionsObject = {
      context: 'Test',
      loggerLevels: ['error'],
      loggerType: 'nest-logger',
    };
    const moduleRef = await Test.createTestingModule({
      imports: [
        EventModule.forRootAsync({ loggerProvider }),
        EventEmitterModule.forRoot(),
      ],
    }).compile();

    const providedLogger = moduleRef.get<ImprovedLoggerService>(EVENT_LOGGER);
    expect(providedLogger).toBeDefined();
  });

  it('should provide logger from factory if loggerProvider is a string', async () => {
    const loggerProvider = 'Test';
    const moduleRef = await Test.createTestingModule({
      imports: [
        EventModule.forRootAsync({ loggerProvider }),
        EventEmitterModule.forRoot(),
      ],
    }).compile();

    const providedLogger = moduleRef.get<ImprovedLoggerService>(loggerProvider);
    expect(providedLogger).toBeDefined();
  });

  it('should initialize the EventModule with optionProvider', async () => {
    const loggerProvider = 'Test';
    const moduleRef = await Test.createTestingModule({
      imports: [
        EventModule.forRootAsync({ loggerProvider },
          {
            provide: OPTION_PROVIDER, useValue:
              { logger: new ImprovedNestLogger('test', {}), emitter: new EventEmitter2() }),
        EventEmitterModule.forRoot(),
      ],
    }).compile();

    const providedLogger = moduleRef.get<ImprovedLoggerService>(loggerProvider);
    expect(providedLogger).toBeDefined();
  });

  it('should provide logger from factory if loggerProvider is a provider', async () => {
    const loggerProvider = {
      provide: 'Test',
      useFactory: () => Logger,
    };
    const moduleRef = await Test.createTestingModule({
      imports: [
        EventModule.forRootAsync({ loggerProvider }),
        EventEmitterModule.forRoot(),
      ],
    }).compile();

    const providedLogger = moduleRef.get<ImprovedLoggerService>(
      loggerProvider.provide,
    );
    expect(providedLogger).toBeDefined();
  });

  it('should provide emitter from factory if eventEmitter is a provider', async () => {
    const eventEmitter = 'Test';
    const provider = {
      provide: eventEmitter,
      useValue: new EventEmitter2(),
    };
    const moduleRef = await Test.createTestingModule({
      imports: [
        EventModule.forRootAsync({
          eventEmitter: { provide: 'test', useExisting: eventEmitter },
        }),
        {
          module: EventEmitterModule,
          providers: [provider],
          exports: [provider],
          global: true,
        },
      ],
    }).compile();

    const providedEmitter = moduleRef.get<EventEmitter2>(eventEmitter);
    expect(providedEmitter).toBeInstanceOf(EventEmitter2);
  });

  // Add more tests as needed to cover all branches of your code
});
