import { EventEmitter2 } from '@nestjs/event-emitter';
import { maskDataInObject } from '@nestjs-yalc/logger/logger.helper.js';
import { globalPromiseTracker } from '@nestjs-yalc/utils/promise.helper.js';
export type EventNameFormatter = (...args: any[]) => string;

export interface IEventEmitterOptions<TFormatter extends EventNameFormatter> {
  formatter?: TFormatter;
  mask?: string[];
  await?: boolean;
}

export function formatName<TFormatter extends EventNameFormatter>(
  name: Parameters<TFormatter> | string,
  formatter?: TFormatter,
) {
  return formatter?.(...name) ?? (Array.isArray(name) ? name.join() : name);
}

export async function emitEvent<TFormatter extends EventNameFormatter>(
  eventEmitter: EventEmitter2,
  name: Parameters<TFormatter> | string,
  payload: any,
  options?: IEventEmitterOptions<TFormatter>,
) {
  const data = options?.mask
    ? maskDataInObject(payload, options.mask)
    : payload;

  const _name = formatName(name, options?.formatter);

  if (!options?.await) {
    return eventEmitter.emit(_name, data);
  } else {
    const promise = eventEmitter.emitAsync(_name, data);

    globalPromiseTracker.add(promise);

    return promise;
  }
}

export function emitFormattedEvent(
  eventEmitter: EventEmitter2,
  name: string,
  payload: any,
  options?: IEventEmitterOptions<SimpleFormatter>,
) {
  return emitEvent(eventEmitter, [name], payload, {
    ...options,
    formatter: simpleFormatter,
  });
}

export type VersionedDomainActionFormatter = (
  version: string,
  context: string,
  action: string,
  when?: string,
) => string;

export const versionedDomainActionFormatter: VersionedDomainActionFormatter = (
  version: string,
  context: string,
  action: string,
  when?: string,
) => {
  return `${version}.${context}.${action}.${when ?? 'onProcess'}`;
};

export type SimpleDotFormatter = (...args: string[]) => string;

export const simpleDotFormatter: SimpleDotFormatter = (...args: string[]) => {
  return args.join('.');
};

export type SimpleFormatter = (action: string) => string;

export const simpleFormatter: SimpleFormatter = (action: string) => {
  return `on${action}`;
};
