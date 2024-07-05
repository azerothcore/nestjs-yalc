import {
  YALC_ALIAS_PLATFORM,
  YalcPlatformAppModule,
} from './platform.module.js';
import { AppBootstrap } from '@nestjs-yalc/app/app-bootstrap.helper.js';

async function bootstrap() {
  await new AppBootstrap(
    YALC_ALIAS_PLATFORM,
    YalcPlatformAppModule,
  ).startServer({
    createOptions: {
      enableSwagger: true,
    },
  });
}

void bootstrap();
