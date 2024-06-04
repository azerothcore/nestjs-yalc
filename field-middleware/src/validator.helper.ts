import { FieldErrorsEnum } from './fields-error.enum.js';

export function errorTrhow(value: string | Date, message?: string) {
  const err = message ? message : `${FieldErrorsEnum.INVALID_VALUE} ${value}`;
  throw new Error(err);
}

export function convertIfStringToDate(date: Date | string): Date {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return date;
}

export function stringIsInEnumOrThrow<
  T extends Record<string, string | number>,
>(toCheck: string, enumName: T, message?: string): true | void {
  if (stringIsInEnum(toCheck, enumName)) {
    return true;
  }
  errorTrhow(toCheck, message);
}

export function stringIsInEnum<T extends Record<string, string | number>>(
  toCheck: string,
  enumName: T,
): boolean {
  for (const enumProperty of Object.values(enumName)) {
    if (`${enumProperty}`.toLowerCase() === toCheck.toLowerCase()) {
      return true;
    }
  }
  return false;
}

export function validateDate(date: Date | string): boolean {
  date = convertIfStringToDate(date);
  if (Object.prototype.toString.call(date) === '[object Date]') {
    if (!isNaN(date.getTime())) {
      return true;
    }
  }
  return false;
}

export function validateDateOrThrow(
  date: Date | string,
  message?: string,
): true | void {
  if (validateDate(date)) {
    return true;
  }
  errorTrhow(date, message);
}

export function validateStringFormat(
  str: string,
  stringFormat: string,
): boolean {
  return str.match(stringFormat) !== null;
}
