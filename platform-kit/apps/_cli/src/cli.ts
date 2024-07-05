import { getAppDirectories } from './helper.ts';
import { program } from 'commander';

program
  .option('-a, --apps [apps]', 'list of app names', (value) => value.split(','))
  .allowUnknownOption(true)
  .parse(process.argv);

const options = program.opts();
const selApps = options.apps === true ? [] : options.apps || [];

async function importCliFilesFromOtherApps() {
  const apps = getAppDirectories();
  for (const app of apps) {
    if (selApps.length && !selApps.includes(app)) {
      continue;
    }

    // eslint-disable-next-line no-console
    console.log(`Importing CLI from ${app}...`);
    await import(`../../${app}/src/cli.ts`);
  }
}

await importCliFilesFromOtherApps();
