import { ___dirname } from '@nestjs-yalc/utils/files.helper.js';
import { readdirSync } from 'fs';

const dirname = ___dirname(import.meta.url);
const relAppDir = `${dirname}/../../`;

export const getAppDirectories = () =>
  readdirSync(relAppDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory() && dirent.name !== '_cli')
    .map((dirent) => dirent.name);
