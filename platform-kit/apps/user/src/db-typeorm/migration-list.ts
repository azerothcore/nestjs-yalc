/**
 * Include this file only if you want to bundle your migrations together with the code
 * e.g. CLI app needs it to run migrations programmatically
 */
import { envIsTrue } from '@nestjs-yalc/utils';
import { TMigrationList } from '@nestjs-yalc/database/db.def.ts';

const migrationList: TMigrationList = [];

if (envIsTrue(process.env.TYPEORM_LOAD_DEV_MIGRATIONS)) {
  // nothing to do
}

export default migrationList;
