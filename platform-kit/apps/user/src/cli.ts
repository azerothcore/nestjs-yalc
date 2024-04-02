/* istanbul ignore file */
import 'source-map-support/register';
import { APP_ALIAS_USER } from './user.def.js';
import { YalcCli } from '@nestjs-yalc/app/cli.helper.js';
import { YalcUserCliModule } from './app-user-cli.module.js';
import { YalcUserDBOpsRunnerService } from './db-typeorm/user-db-ops.service.js';

async function main() {
  const cli = new YalcCli();

  const appAlias = APP_ALIAS_USER;

  cli.dbDefaultCommandsFactory(
    appAlias,
    YalcUserCliModule,
    YalcUserDBOpsRunnerService,
  );

  await cli.parseAsync();
}

await main();
