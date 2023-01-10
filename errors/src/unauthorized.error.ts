import { UnauthorizedException } from '@nestjs/common';
import { ErrorsEnum } from './errors.enum';

export class UnauthorizedError extends UnauthorizedException {
  constructor(message?: string) {
    super(
      message
        ? `${ErrorsEnum.UNAUTHORIZED}: ${message}`
        : ErrorsEnum.UNAUTHORIZED,
    );
  }
}
