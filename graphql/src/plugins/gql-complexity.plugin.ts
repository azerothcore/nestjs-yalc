import { Plugin } from '@nestjs/apollo';
import { GqlComplexityHelper } from './gql-complexity.helper.js';
import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';

@Plugin()
export class GqlComplexityPlugin implements ApolloServerPlugin {
  async requestDidStart(): Promise<GraphQLRequestListener<any>> {
    return {
      async didResolveOperation({
        document,
        schema,
      }: {
        document: any;
        schema: any;
      }) {
        GqlComplexityHelper.processDocumentAST(document, schema);
      },
    };
  }
}
