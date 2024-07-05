import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { modelFieldToDest } from './model-object.helper.js';
import { ClassType } from '@nestjs-yalc/types/globals.d.js';

export function modelFieldMapperInterceptor(
  inputClass: ClassType,
  outputClass: ClassType,
) {
  @Injectable()
  class ModelFieldMapperInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const request = context.switchToHttp().getRequest();
      if (request.body) {
        const mappedInput = modelFieldToDest(inputClass, outputClass);
        context.switchToHttp().getRequest().body = mappedInput;
      }

      return next.handle().pipe(
        map((data) => {
          return modelFieldToDest(data, outputClass);
        }),
      );
    }
  }

  return ModelFieldMapperInterceptor;
}
