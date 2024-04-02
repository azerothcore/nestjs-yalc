/**
 * This file is only used to adjust the arguments passed to jest by vscode
 * since vscode passes some arguments that causes jest to fail or not generate coverage
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
import cp from 'child_process';
import * as url from 'url';
// const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const newArgs = process.argv
  .slice(2)
  .filter(
    (p) =>
      ![
        '--testPathPattern', // we want to treat the path by using the parser of our jest.config.ts
        // '--findRelatedTests', // this was not letting jest to generate coverage, but apparently it is not used anymore by vscode
        '--testLocationInResults', // this causes an error in vscode (to investigate)
      ].includes(p),
  )
  .map((p) => {
    if (!p.startsWith('--')) {
      return `"${p}"`; // we need to wrap the argument values with quotes to avoid issues with spaces
    }

    return p;
  });

var command = 'npm';

const path = newArgs.pop();

cp.execSync(`npm run test:cov -- ${newArgs.join(' ')} ${path}`, {
  cwd: process.cwd(),
  env: process.env,
  stdio: [process.stdin, process.stdout, process.stderr],
  encoding: 'utf-8',
});
