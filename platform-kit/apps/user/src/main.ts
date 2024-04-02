import { YalcAppUserApiModule } from './app-user-api.module.js';
import { AppBootstrap } from '@nestjs-yalc/app/app-bootstrap.helper.js';
import { APP_ALIAS_USER_API } from './user.def.js';

async function bootstrap() {
  const app = new AppBootstrap(APP_ALIAS_USER_API, YalcAppUserApiModule);
  await app.startServer();
}

void bootstrap();
