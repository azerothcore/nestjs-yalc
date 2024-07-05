import { getAppDirectories } from './helper.js';

/**
 * This is used for the "build all" process
 */

async function importMainFilesFromOtherApps() {
  const apps = getAppDirectories();
  for (const app of apps) {
    // eslint-disable-next-line no-console
    console.log(`Importing Main from ${app}...`);
    await import(`../../${app}/src/main.ts`);
  }
}

await importMainFilesFromOtherApps();
