/* istanbul ignore file */
process.env.AWS_REGION = 'eu-west-1';
import { afterAll, beforeAll, jest } from '@jest/globals';

// setup some environments
process.env.NODE_ENV = 'test';
process.env.TYPEORM_PORT = '63307';

beforeAll(async () => {
  jest.setTimeout(100000);
});

afterAll(() => {
  // execSync('docker compose stop db-test');
});
