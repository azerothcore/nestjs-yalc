import { AppBootstrap } from '@nestjs-yalc/app/app-bootstrap.helper.js';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { TestingModule } from '@nestjs/testing';

export const initTestingApp = async (
  moduleFixture: TestingModule,
  appBuilder: AppBootstrap,
) => {
  const app = moduleFixture.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  );
  appBuilder.setApp(app);
  await appBuilder.initSetup();
  await app.getHttpAdapter().getInstance().ready();

  return app;
};
