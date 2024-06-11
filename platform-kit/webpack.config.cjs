/* eslint-disable @typescript-eslint/no-var-requires */
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const Visualizer = require('webpack-visualizer-plugin2');
const glob = require('glob');
const webpack = require('webpack');
// const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const nestCliJson = require('./nest-cli.json');
const { AssetsManager } = require('@nestjs/cli/lib/compiler/assets-manager');
const path = require('path');
const { program } = require('commander');
const { findDevDependencies } = require('../scripts/src/dev-deps-finder.cjs');
const { execSync, spawn } = require('child_process');
const { mkdirSync, writeFileSync, existsSync } = require('fs');
const { cpus } = require('os');
const nodeExternals = require('webpack-node-externals');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CopyPlugin = require('copy-webpack-plugin');

console.debug('============== LOAD WEBPACK CONFIG ==============');

const devDeps = findDevDependencies(path.join(__dirname, 'package-lock.json'));
/**
 * dotenv to load the .env file
 */
require('dotenv').config({
  path: path.resolve(__dirname, '.env.webpack'),
});

// const swcDefaultConfig =
//   require('@nestjs/cli/lib/compiler/defaults/swc-defaults').swcDefaultsFactory()
//     .swcOptions;

program
  .option('-a, --apps <apps>', 'list of app names', (value) => value.split(','))
  .allowUnknownOption()
  .parse(process.argv);
const options = program.opts();

/**
 * ENV variables
 */
const isStartWebpack = process.env.WEBPACK_START_APP === 'true';
const isProd = process.env.NODE_ENV === 'production';
// this checks if we want to run the full ts check by checking yalc and infra dependencies (otherwise the pipeline/specific commands will do that)
const fullTsCheck = process.env.WEBPACK_FULL_TS_CHECK === 'true';
const cleanFolder = process.env.BUILD_CLEAN_FOLDER !== 'false' || true;
const buildApps = process.env.BUILD_APPS;
const apps = options.apps || process.env.BUILD_APPS?.split(',') || [];
const enableWebpackVisualizer = process.env.NEST_WEBPACK_VISUALIZER === 'true';
const enableWebpackAnalyzer = process.env.NEST_WEBPACK_ANALYZER === 'true';

console.log('ENV:', {
  isStartWebpack,
  isProd,
  fullTsCheck,
  cleanFolder,
  buildApps,
  apps,
  enableWebpackVisualizer,
  enableWebpackAnalyzer,
});

/**
 * Other configs
 */
const isStartNest = process.argv.includes('start');
const nestCliJsonCopy = JSON.parse(JSON.stringify(nestCliJson));

const ROOT_DIR = `var/task/`;

/**
 * Run nestjs actions like copy assets. This is needed because we are running
 * webpack from the root of the project, but nestjs actions are triggered only
 * when running with the `nest build` command.
 *
 * @todo remove this once we do not have to support legacy api + compilation from the root folder anymore
 *
 * @param {string} appName
 */
function runNestJsActions(appName) {
  // fix outDir relative paths
  nestCliJsonCopy.projects[appName].compilerOptions?.assets?.forEach(
    (asset) => {
      if (typeof asset !== 'string') {
        /**
         * @type {string}
         */
        const outDir = asset.outDir ?? '';

        /**
         * We want to make sure that the outDir for the assets is always the right one
         * in case we are building for lambda layers or not
         */
        const fixedOutDir = !outDir.includes(`dist/${ROOT_DIR}`)
          ? outDir.replace(`dist/`, `dist/${ROOT_DIR}`)
          : outDir;

        if (fixedOutDir && !fixedOutDir.startsWith('/')) {
          console.log('Copying in ', fixedOutDir);

          const newOutDir = path.relative(
            process.cwd(),
            path.resolve(path.join(__dirname, fixedOutDir)),
          );

          nestCliJsonCopy.projects[appName].compilerOptions.assets[
            nestCliJsonCopy.projects[appName].compilerOptions.assets.indexOf(
              asset,
            )
          ].outDir = newOutDir;
        }
      }
    },
  );

  /**
   * We need this function to wait for the watchers to close
   * This happens because the assets manager is waiting for the assets to be copied
   * but it doesn't return a Promise that we can await for.
   * This monkey-patch approach accesses the private `actionInProgress` variable
   * to wait for it outside
   */
  function waitForWatchersToClose(context) {
    return new Promise((resolve) => {
      const checkActionInProgress = () => {
        if (!context.actionInProgress) {
          resolve();
        } else {
          console.log('Watchers still open...waiting...');
          setTimeout(checkActionInProgress, 500); // Check every 500ms
        }
      };
      checkActionInProgress();
    });
  }

  const config = nestCliJsonCopy.projects[appName];
  // console.log(JSON.stringify(config, null, 2));

  const oldCwd = process.cwd();
  process.chdir(__dirname);
  const assetsManager = new AssetsManager();
  assetsManager.copyAssets(
    nestCliJsonCopy,
    appName,
    `${__dirname}/dist/${ROOT_DIR}${config.root}`,
    true,
  );
  assetsManager.closeWatchers();
  waitForWatchersToClose(assetsManager).then(() => {
    // console.log('Watchers closed');
  });
  process.chdir(oldCwd);
}

const forkTsCheckPlugins = [
  new ForkTsCheckerWebpackPlugin({
    // we need it to catch the errors before the compilation ends
    // also it doesn't seem to impact the performance
    async: false,
    typescript: {
      memoryLimit: 4096,
      configFile: fullTsCheck
        ? `${__dirname}/utils/tsconfig.ref.json`
        : `${__dirname}/tsconfig.json`,
      mode: 'write-references',
      build: true,
      profile: true,
    },
  }),
];

class ForkTsCheckerWebpackPluginHooks {
  constructor(isStartWebpack) {
    this.isStartWebpack = isStartWebpack;
    this.slsStarted = false;
  }

  apply(compiler) {
    const hooks = ForkTsCheckerWebpackPlugin.getCompilerHooks(compiler);

    let hasError;
    let errorCheckCount;
    const errorCheckLimit = forkTsCheckPlugins.length; // this is the number of ForkTsCheckerWebpackPlugin instances

    // log some message on waiting
    hooks.start.tap('ForkTsHooks', () => {
      errorCheckCount = 0;
      hasError = false;
    });

    // don't show warnings
    hooks.issues.tap('ForkTsHooks', (issues) => {
      errorCheckCount++;
      const isError = issues.find((issue) => issue.severity === 'error');
      if (isError) hasError = true;

      console.log('Issues:', issues.length, 'TsCheck #', errorCheckCount);

      if (!hasError && errorCheckCount >= errorCheckLimit) {
        writeFileSync(
          path.resolve(__dirname, 'var/last-build-success.txt'),
          new Date().toISOString(),
        );

        if (this.isStartWebpack && !this.slsStarted) {
          spawn('npm', ['run', 'start:sls:dev'], {
            stdio: 'inherit',
            cwd: path.resolve(__dirname, '../../'),
          });
          this.slsStarted = true;
        }
      }
    });
  }
}

module.exports = (nestJsOptions) => {
  // console.log(JSON.stringify(nestJsOptions, null, 2), nestJsOptions);
  // console.log(nestJsOptions.plugins[1].options);

  const lazyImports = [
    '@nestjs/microservices/microservices-module',
    '@nestjs/websockets/socket-module',
    'class-transformer/storage',
    'cache-manager',
    '@nestjs/microservices',

    /**
     * Do we still need this?
     * Do not remove for now as we might need it in future
     */

    // 'class-validator',
    // 'class-transformer',
  ];

  // native modules that we don't want to bundle
  const externals = [
    {
      sqlite3: 'commonjs sqlite3',
    },
  ];

  const appPathParts = nestJsOptions?.output?.filename?.split('/') || [];
  const folderName = appPathParts[appPathParts.length - 2];
  /**
   * @type {string} fileName
   */
  const fileName = appPathParts[appPathParts.length - 1];

  console.log('Filename:', fileName);

  // small hack/workaround to get the app name and the command
  // if run with nest build, then we have a filename, otherwise fallback to 'all'
  let appName =
    folderName ??
    buildApps ?? // we can also pass the app name via env
    'all';

  if (appName === '_cli') appName = 'all';

  let entry;

  console.log('Selected apps', apps.length > 0 ? apps.join(',') : appName);

  let selectedApps = [];

  if (appName === 'all') {
    console.log('Building all apps');
    entry = glob
      .sync([
        `${__dirname}/apps/*/src/handlers/*.ts`,
        `${__dirname}/apps/*/src/main.ts`,
        `${__dirname}/apps/_srv/*/src/handlers/*.ts`,
        `${__dirname}/apps/_srv/*/src/main.ts`,
      ])
      .reduce((acc, /** @type String */ item) => {
        if (item.includes('.spec.ts')) return acc;

        const parts = item.replace('.ts', '').replace(__dirname, '').split('/');
        const thisApp = parts[item.includes(`_srv`) ? 3 : 2]; // ./apps/${2}
        const name = parts.pop(); // last part of the path is the filename

        if (apps.length > 0 && !apps.includes(thisApp)) return acc;

        const key =
          name !== 'main' ? `apps/${thisApp}/${name}` : `apps/${thisApp}`;
        acc[key] = item;
        return acc;
      }, {});
  } else {
    console.log('Building single app', appName);
    const nestJsProject = nestCliJson.projects[appName];

    if (!nestJsProject) {
      throw new Error(`App ${appName} not found in nest-cli.json`);
    }

    entry = glob
      .sync([`${__dirname}/${nestJsProject.sourceRoot}/handlers/*.ts`])
      .reduce((acc, /** @type String */ item) => {
        if (item.includes('.spec.ts')) return acc;
        // when command is start, we don't want to bundle the handlers, but only the main.ts
        // this also fixes the vscode debugger issue with multiple entry points
        if (isStartNest) return acc;

        const name = item
          .replace('.ts', '')
          .replace(__dirname, '')
          .split('/')
          .pop();
        acc[`${nestJsProject.root}/${name}`] = item;
        return acc;
      }, {});

    selectedApps = apps;

    entry[
      `${nestJsProject.root}`
    ] = `${__dirname}/${nestJsProject.sourceRoot}/main.ts`;
  }

  selectedApps.forEach((app) => {
    const nestJsProject = nestCliJson.projects[app];

    entry[
      `${nestJsProject.root}`
    ] = `${__dirname}/${nestJsProject.sourceRoot}/main.ts`;
  });

  entry['webpack/hot/poll?100'] = 'webpack/hot/poll?100';
  // entry['webpack/hot/signal?100'] = 'webpack/hot/signal?100';

  /**
   * These are the default nest options that we extrapolated from the nest build command
   * However, we want to run webpack using the official cli, that's why we need to define
   * these configs here
   */
  /** @type {import('webpack').Configuration} */

  // const defaultNest = {
  //   ...webpackDefaultsFactory(
  //     __dirname,
  //     __dirname,
  //     '',
  //     true,
  //     'tsconfig.build.json',
  //     [],
  //   ),
  //   ...(nestJsOptions ?? {}),
  // };

  const defaults = {
    // probably we do not want to use nest options to avoid having different
    // options between nest build and webpack native build
    // ...defaultNest,

    // devtool: false,
    target: 'node',
    ignoreWarnings: [/^(?!CriticalDependenciesWarning$)/],
    // externals: [null],
    externalsPresets: {
      node: true,
    },
    module: {
      rules: [
        {
          test: /.node$/,
          loader: 'node-loader',
        },
        {
          test: /\.([cm]?ts|tsx)$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: true, // typechecking is done by ForkTsCheckerWebpackPlugin which is faster
                configFile: `${__dirname}/tsconfig.build.json`,
                getCustomTransformers: (program) => ({
                  before: [
                    require('@nestjs/graphql/plugin').before(
                      {
                        introspectComments: true,
                        typeFileNameSuffix: [
                          '.input.ts',
                          '.args.ts',
                          '.arg.ts',
                          '.dto.ts',
                          '.entity.ts',
                          '.type.ts',
                        ],
                      },
                      program,
                    ),
                    require('@nestjs/swagger/plugin').before(
                      {
                        classValidatorShim: true,
                        dtoFileNameSuffix: [
                          '.type.ts',
                          '.dto.ts',
                          '.entity.ts',
                        ],
                      },
                      program,
                    ),
                  ],
                }),
              },
            },
          ],
          exclude: /node_modules/,
          // use: {
          //   loader: 'swc-loader',
          //   options: {
          //     ...swcDefaultConfig,
          //   },
          // },
        },
      ],
    },
    resolve: {
      // Add `.ts` and `.tsx` as a resolvable extension.
      extensions: ['.ts', '.tsx', '.js'],
      // Add support for TypeScripts fully qualified ESM imports.
      extensionAlias: {
        '.js': ['.js', '.ts'],
        '.cjs': ['.cjs', '.cts'],
        '.mjs': ['.mjs', '.mts'],
      },
    },
    mode: 'none',
    optimization: {
      nodeEnv: false,
    },
    node: {
      global: true,
      __filename: true,
      __dirname: true,
    },
    plugins: [
      ...forkTsCheckPlugins,
      new ForkTsCheckerWebpackPluginHooks(isStartWebpack),
      new webpack.WatchIgnorePlugin({
        paths: [/\.js$/, /\.d\.ts$/],
      }),
    ],
  };

  console.log('Project name', appName);
  console.log(
    'is start:',
    isStartNest ? 'nest' : isStartWebpack ? 'webpack' : 'false',
  );
  console.log(`Building in ${isProd ? 'production' : 'development'} mode`);

  /** @type {import('webpack').Configuration} */
  const config = {
    ...defaults,
    parallelism: cpus().length * 10, // by default is 100, but we want to change this based on the number of cpus
    context: __dirname,
    output: {
      ...(defaults.output ?? {}),
      // the file should reside in a folder with its own name
      filename: `${ROOT_DIR}[name]/main.js`,
      path: `${__dirname}/dist`,
      module: true,
      chunkFormat: 'module',
      chunkLoading: 'import',
      library: {
        type: 'module',
      },
      // clean: cleanFolder,
    },
    experiments: {
      outputModule: true,
    },
    optimization: {
      ...defaults.optimization,
      runtimeChunk: 'single',
      splitChunks: {
        ...defaults.optimization?.splitChunks,
        filename: 'opt/chunks-[name].js',
        chunks: 'all',
        /**
         * Create chunks for everything to speedup the compilation time
         */
        cacheGroups: {
          ...defaults.optimization?.splitChunks?.cacheGroups,
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            filename: `opt/vendors/modules.js`,
            chunks: 'all',
            // enforce: true,
            reuseExistingChunk: true,
          },
          // libs: {
          //   test: /[\\/]libs[\\/]/,
          //   name: 'libs',
          //   filename: `opt/libs/libs.js`,
          //   chunks: 'all',
          //   reuseExistingChunk: true,
          // },
          // deps: {
          //   test: /[\\/]deps[\\/]/,
          //   name: 'deps',
          //   filename: `opt/deps/deps.js`,
          //   chunks: 'all',
          //   reuseExistingChunk: true,
          // },
          // apps: {
          //   test: /[\\/]apps[\\/]/,
          //   name: 'apps',
          //   filename: `opt/apps/apps.js`,
          //   chunks: 'all',
          //   reuseExistingChunk: true,
          // },
        },
      },
    },
    entry,
    devtool: isProd ? undefined : 'source-map', // in production we should set `source-map`, but this slows down the lambda initialization. We need to migrate to fargate first
    mode: isProd ? 'production' : 'development',
    plugins: [
      ...(defaults.plugins ?? []),
      // new webpack.ProgressPlugin({
      //   handler: (percentage, message, ...args) => {
      //     // e.g. Output each progress message directly to the console:
      //     console.info(percentage, message, ...args);
      //   },
      // }),
      new webpack.IgnorePlugin({
        checkResource(resource) {
          if (!lazyImports.includes(resource)) {
            return false;
          }
          try {
            require.resolve(resource, {
              paths: [process.cwd()],
            });
          } catch (err) {
            return true;
          }
          return false;
        },
      }),
      /**
       * We need a package.json with the "type:module" properties to let AWS loading the files as ESM
       */
      new CopyPlugin({
        patterns: [
          { from: 'utils/package.json', to: 'opt' },
          { from: 'utils/package.json', to: 'var/task' },
        ],
      }),
    ],
  };

  /**
   * Visualizer plugin
   * @see https://github.com/jonamat/webpack-visualizer-plugin2
   */
  if (enableWebpackVisualizer) {
    config.plugins.push(
      new Visualizer({
        filename: `${__dirname}/var/webpack-stats.html`,
      }),
    );
  }

  if (enableWebpackAnalyzer) {
    config.plugins.push(new BundleAnalyzerPlugin());
  }

  if (isProd) {
    /**
     * PROD
     */

    config.optimization = {
      ...config.optimization,
      minimize: false,
      minimizer: [
        new TerserPlugin({
          parallel: true,
          minify: TerserPlugin.esbuildMinify,
          terserOptions: {
            minify: false,
            minifyWhitespace: true,
            minifyIdentifiers: false,
            minifySyntax: true,
          },
        }),
      ],
      usedExports: true,
      sideEffects: true,
      providedExports: true,
    };

    config.externals = [...externals, ...devDeps];
    config.plugins.push(new webpack.optimize.ModuleConcatenationPlugin());
  } else {
    /**
     * DEV
     */

    config.externals = [
      nodeExternals({
        allowlist: [
          /@nestjs-yalc(.*)/,
          // 'webpack/hot/poll?100',
          // 'webpack/hot/signal?100',
        ],
        importType: (moduleName) => {
          const packagePath = path.join(
            __dirname,
            'node_modules',
            moduleName,
            'package.json',
          );
          if (existsSync(packagePath)) {
            const packageJson = require(packagePath);
            if (packageJson.type === 'module') {
              return `module ${moduleName}`; // Use ESM import syntax
            }
          }
          return `node-commonjs ${moduleName}`; // Default to CommonJS
        },
        additionalModuleDirs: [
          path.resolve(__dirname, 'node_modules'),
          '../node_modules',
        ],
      }),
      ...externals,
      ...devDeps,
    ];
    config.optimization = {
      ...config.optimization,
      minimize: false,
      removeAvailableModules: false,
      removeEmptyChunks: false,
    };

    config.output = {
      ...config.output,
      pathinfo: false,
    };
  }

  // rimraf dist folder, clean: true is not always working
  console.log(`Cleaning ${config.output.path} folder`);
  if (cleanFolder) execSync(`npx -y rimraf ${config.output.path}`);
  mkdirSync(config.output.path, { recursive: true });

  // uncomment to check what's the result of the webpack config
  // console.log('Webpack Config', JSON.stringify(config, null, 2));
  // process.exit(0);

  config.plugins.push(
    /**
     * Plugin to run the nestjs actions at the webpack shutdown
     */
    function () {
      this.hooks.done.tapAsync('shutdown', function (stats, callback) {
        console.log(`==== Running NestJS actions for ${appName} ====`);
        if (appName === 'all') {
          Object.keys(nestCliJson.projects).forEach((project) => {
            runNestJsActions(project);
          });
        } else {
          runNestJsActions(appName);
        }

        callback();
      });
    },
  );

  const cacheLocation = path.resolve(__dirname, 'var/webpack-cache');
  config.cache = {
    type: 'filesystem',
    cacheLocation,
    allowCollectingMemory: false,
    buildDependencies: {
      // This makes all dependencies of this file - build dependencies
      config: [__filename],
      // By default webpack and loaders are build dependencies
    },
  };

  /**
   * Try to change the version when the config changes
   */
  config.cache.version = JSON.stringify(config);

  // console.log(`Cleaning ${cacheLocation} cache`);
  // execSync(`npx -y rimraf ${cacheLocation}`);
  mkdirSync(cacheLocation, { recursive: true });

  return config;
};
