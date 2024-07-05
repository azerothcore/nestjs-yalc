import { UUIDValidationError } from './uuid-validation.error.js';
import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

@Scalar('UUID')
export class UUIDScalar implements CustomScalar<string, string> {
  description = 'UUID Scalar Type';

  parseValue(value: unknown): string {
    if (typeof value !== 'string' || !validateUUID(value))
      throw new UUIDValidationError(formatValueErrorMessage(`${value}`));
    return value;
  }

  serialize(value: unknown): string {
    if (typeof value !== 'string')
      throw new UUIDValidationError(formatValueErrorMessage(`${value}`));

    return value;
  }

  parseLiteral(ast: ValueNode): string {
    if (ast.kind === Kind.STRING) {
      const id = ast.value;
      return this.parseValue(id);
    }
    throw new UUIDValidationError(formatKindErrorMessage(ast.kind));
  }
}

export function formatValueErrorMessage(id: string) {
  return `"${id}" is not a valid UUID`;
}

export function formatKindErrorMessage(kind: string) {
  return `A string were expected for the UUID Type, received ${kind}`;
}

export function validateUUID(uuid: string) {
  //012345678901234567890123456798012345
  //xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx
  const uuidCopy = [...uuid];
  const dashPosition = [23, 18, 13, 8];

  if (uuidCopy.length !== 36) {
    return false;
  }
  for (const i of dashPosition) {
    if (uuidCopy[i] !== '-') {
      return false;
    }
    delete uuidCopy[i];
  }
  for (const char of uuidCopy) {
    if (char === '-') {
      return false;
    }
  }
  return true;
}
