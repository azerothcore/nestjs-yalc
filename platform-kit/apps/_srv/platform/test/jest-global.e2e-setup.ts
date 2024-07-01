import { execSync } from 'child_process';
import path from 'path';

export default async function setup() {
  execSync('docker compose up -d --wait yalc-database-test');

  /**
   * Execute migration before all tests
   */
  // execSync(`npm run cli -- all seed --drop-db`, {
  //   stdio: 'inherit',
  //   cwd: path.resolve(__dirname, `../../../`),
  //   env: {
  //     ...process.env,
  //     TYPEORM_PORT: '63307',
  //     // NEST_LOGGER_LEVELS: 'error,warn',
  //   },
  // });
}
