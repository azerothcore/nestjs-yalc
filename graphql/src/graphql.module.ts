import { Module } from '@nestjs/common';
import { UUIDScalar } from './scalars/uuid.scalar.ts';
import { ApolloDriverConfig, ApolloDriver } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
    }),
  ],
  providers: [UUIDScalar],
})
export class YalcGraphQL {}
