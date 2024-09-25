import { ClassType } from '@nestjs-yalc/types/globals.js';
import { isClass } from '@nestjs-yalc/utils/class.helper.js';
import { httpExceptionStatusCodes } from '@nestjs-yalc/utils/http.helper.js';
import { isDefaultErrorMixinClass } from './default.error.js';

/**
 * Function to convert all HttpException based errors classes to their corresponding status code
 * using a predefined list of status codes
 */
export function getStatusCodeFromError(error: ClassType<any> | any) {
  /**
   * If it's not a class, check if it has a getStatus method
   */
  if (!isClass(error)) {
    if (error.getStatus) {
      return error.getStatus();
    }

    return null;
  }

  /**
   * Check Default error classes
   */
  if (isDefaultErrorMixinClass(error)) {
    return error.defaultStatusCode;
  }

  /**
   * Check HttpException classes
   */
  const errorName = error.name;
  return httpExceptionStatusCodes[errorName] || null;
}
