/* istanbul ignore file */

// @ts-expect-error - we do not need to define the type of the transformer
import transformer from '@nestjs/graphql/plugin';
import type { TsCompilerInstance } from 'ts-jest/dist/types';

/**
 * Remember to increase the version whenever transformer's content is changed. This is to inform Jest to not reuse
 * the previous cache which contains old transformer's content
 */
export const version = 7;
// Used for constructing cache key
export const name = 'nestjs-graphql-transformer';

export function factory(compilerInstance: TsCompilerInstance) {
  /**
   * We need isolatedModules to be false to avoid program being undefined
   */
  const program = compilerInstance.program;
  return transformer(program, {
    typeFileNameSuffix: [
      '.input.ts',
      '.args.ts',
      '.arg.ts',
      '.entity.ts',
      '.type.ts',
      '.dto.ts',
    ],
    introspectComments: true,
  });
}
