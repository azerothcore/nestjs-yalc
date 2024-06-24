import { IProjectInfo } from './jest-conf.generator';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';

export function nestjsCliJsonToProjectList(nestCliJson: any): {
  [key: string]: IProjectInfo;
} {
  const projectList: { [key: string]: IProjectInfo } = {};

  Object.keys(nestCliJson.projects).map((k: any) => {
    const p = nestCliJson.projects[k];
    projectList[k] = {
      path: p.root,
      sourcePath: p.sourceRoot,
      type: p.type,
    };
  });

  return projectList;
}

export const runQuery = async (options: {
  app: NestFastifyApplication;
  // loginApp: NestFastifyApplication;
  query: string;
  queryName: string;
  done?: (data?: any) => void;
  callback?: { (body: any): void };
  skipExpect?: boolean;
  statusCode?: number;
  variables?: any;
}) => {
  const {
    app,
    // loginApp,
    query,
    queryName,
    callback,
    // done,
    skipExpect = false,
    statusCode = 200,
    variables,
  } = options;
  /**
   * @todo - implement getJWT login
   */
  // const jwt = await getJWT(loginApp, role);

  return (
    request(app.getHttpServer())
      .post('/graphql')
      // .set('Authorization', jwt)
      .send({
        operationName: null,
        query,
        variables,
      })
      .expect(({ body }: { body: any }) => {
        const data = body.data?.[queryName];
        const errors = body.errors?.length ? body.errors : undefined;

        if (!skipExpect) {
          if (errors) {
            // eslint-disable-next-line no-console
            console.error(errors);
          }

          expect(errors).not.toBeDefined();
          expect(data).toBeDefined();
        }

        callback && callback(body);
      })
      .expect(statusCode)
  );
};
