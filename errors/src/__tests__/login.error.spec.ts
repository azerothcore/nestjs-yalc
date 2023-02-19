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
import { ErrorsEnum } from '../errors.enum.js';
import { LoginError } from '../login.error.js';

describe('Login error', () => {
  const error = new LoginError();

  it('should be defined', () => {
    expect(error).toBeDefined();
  });

  it('should have the correct message', () => {
    expect(error.message).toEqual(ErrorsEnum.BAD_LOGIN);
  });

  it('should set the custom message', () => {
    const customMessage = 'Something catastrophic happened!';
    const customError = new LoginError(undefined, customMessage);
    expect(customError.message).toEqual(customMessage);
  });
});
