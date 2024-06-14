import { ClassType } from '@nestjs-yalc/types/globals.d.js';

export function isClass(func: any): func is ClassType {
  return (
    typeof func === 'function' && /^class\s/.test(func.toString.call(func))
  );
}
