import { ___dirname } from '@nestjs-yalc/utils/files.helper.js';
import { existsSync, readdirSync } from 'fs';

const dirname = ___dirname(import.meta.url);
const relAppDir = `${dirname}/../../`;

export const getAppDirectories = () =>
  readdirSync(relAppDir, { withFileTypes: true })
    .filter(
      (dirent) =>
        dirent.isDirectory() &&
        dirent.name !== '_cli' &&
        existsSync(`${relAppDir}${dirent.name}/package.json`),
    )
    .map((dirent) => dirent.name);
