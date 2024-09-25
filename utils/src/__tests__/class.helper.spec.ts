import { isClass } from '../class.helper.js';
import {
  describe,
  expect,
  it,
  jest,
  beforeAll,
  beforeEach,
} from '@jest/globals';
import { DefaultError } from '@nestjs-yalc/errors/default.error.js';

describe('Test Class Helpers', () => {
  it('should test a class correctly', () => {
    expect(isClass(class {})).toBeTruthy();
  });

  it('should test a class correctly', () => {
    expect(
      isClass(function (nothing: any) {
        nothing;
      }),
    ).toBeFalsy();
  });

  it('expect an instance of a class to not be a class', () => {
    expect(isClass(new (class {})())).toBeFalsy();
  });

  it('should test a class against a name', () => {
    const defaultError = DefaultError;
    expect(isClass(class Test {}, 'Test')).toBeTruthy();
    expect(isClass(class Test {}, 'Test2')).toBeFalsy();
    expect(isClass(defaultError, DefaultError.name)).toBeTruthy();
  });
});
