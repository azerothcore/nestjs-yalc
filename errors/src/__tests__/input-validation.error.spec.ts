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
import {
  BadRequestError,
  InputValidationError,
} from '../input-validation.error.js';

describe('InputValidationError', () => {
  it('should set the custom message', () => {
    const customMessage = 'INVALID_INPUT_MESSAGE';
    const customError = new InputValidationError(customMessage);
    expect(customError.message).toEqual(customMessage);
  });

  it('should set the custom message', () => {
    const customMessage = 'INVALID_INPUT_MESSAGE';
    const customError = new BadRequestError(customMessage);
    expect(customError.message).toEqual(customMessage);
  });
});
