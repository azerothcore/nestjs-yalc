import { describe, expect, it } from '@jest/globals';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  getYalcGlobalEventEmitter,
  setYalcGlobalEventEmitter,
} from '../global-emitter.js';

describe('GlobalEmitter', () => {
  it('should return the same instance of the event emitter', () => {
    setYalcGlobalEventEmitter(undefined);
    const eventEmitter = getYalcGlobalEventEmitter();
    expect(eventEmitter).toBeDefined();
    expect(getYalcGlobalEventEmitter()).toBe(eventEmitter);
  });

  it('should set the event emitter', () => {
    const eventEmitter = getYalcGlobalEventEmitter();
    const newEventEmitter = new EventEmitter2();
    setYalcGlobalEventEmitter(newEventEmitter);
    expect(getYalcGlobalEventEmitter()).toBe(newEventEmitter);
    setYalcGlobalEventEmitter(eventEmitter);
  });
});
