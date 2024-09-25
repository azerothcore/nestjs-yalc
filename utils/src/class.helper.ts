import { ClassType } from '@nestjs-yalc/types/globals.d.js';

// Check if the class is a native class (like Error, Array, etc.)
export function isNativeClass<T>(
  func: any,
  className?: string,
): func is ClassType<T> {
  return (
    typeof func === 'function' &&
    func.prototype?.constructor === func && // Native class constructors have this prototype constructor link
    (className ? func.name === className : true)
  );
}

// Check if the class is an ES6-style class
export function isES6Class<T>(
  func: any,
  className?: string,
): func is ClassType<T> {
  return (
    typeof func === 'function' &&
    /^class\s/.test(func.toString()) && // ES6 classes start with the keyword "class"
    (className ? func.name === className : true)
  );
}

// Check if the class is either native or ES6
export function isClass<T>(
  func: any,
  className?: string,
): func is ClassType<T> {
  return isNativeClass(func, className) || isES6Class(func, className);
}
