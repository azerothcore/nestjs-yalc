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
const { execSync } = require('child_process');
console.debug('============== LOAD WEBPACK CONFIG ==============');

const devDeps = findDevDependencies(__dirname + '/package-lock.json');

program
  .option('-a, --apps <apps>', 'list of app names', (value) => value.split(','))
  .allowUnknownOption()
  .parse(process.argv);

const cleanFolder = process.env.BUILD_CLEAN_FOLDER !== 'false' || true;
const options = program.opts();
const apps = options.apps || process.env.BUILD_APPS?.split(',') || [];

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
        const fixedOutDir = outDir.replace(`dist/`, `dist/${ROOT_DIR}`);

        console.log('Copying in ', fixedOutDir);

        if (fixedOutDir && !fixedOutDir.startsWith('/')) {
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
  const config = nestCliJsonCopy.projects[appName];
  // console.log(JSON.stringify(config, null, 2));
  const oldCwd = process.cwd();
  process.chdir(__dirname);
  const assetsManager = new AssetsManager();
  assetsManager.copyAssets(
    nestCliJsonCopy,
    appName,
    `${__dirname}/dist/${config.root}`,
    false,
  );
  assetsManager.closeWatchers();
  process.chdir(oldCwd);
}

module.exports = (nestJsOptions) => {
  // console.log(JSON.stringify(options, null, 2), options);
  // console.log(options.plugins[1].options);

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

  // small hack/workaround to get the app name and the command
  // if run with nest build, then we have a filename, otherwise fallback to 'all'
  let appName =
    folderName ??
    process.env.NEST_BUILD_APP ?? // we can also pass the app name via env
    'all';

  const command = process.argv[2]; // npm (0) run (1) command (2)

  if (appName === '_all' || fileName?.startsWith('all.cjs')) appName = 'all';

  let entry;

  console.log('Selected apps', apps.length > 0 ? apps.join(',') : appName);

  if (appName === 'all' || apps.length > 0) {
    entry = glob
      .sync(
        command !== 'start'
          ? `${__dirname}/apps/*/src/handlers/*.ts`
          : `${__dirname}/apps/*/src/main.ts`,
      )
      .reduce((acc, /** @type String */ item) => {
        if (item.includes('.spec.ts')) return acc;

        const parts = item.replace('.ts', '').replace(__dirname, '').split('/');
        const thisApp = parts[2]; // ./apps/${2}
        const name = parts.pop(); // last part of the path is the filename

        if (apps.length > 0 && !apps.includes(thisApp)) return acc;

        const key =
          command !== 'start' ? `apps/${thisApp}/${name}` : `apps/${thisApp}`;
        acc[key] = item;
        return acc;
      }, {});
  } else {
    const nestJsProject = nestCliJson.projects[appName];

    if (!nestJsProject) {
      throw new Error(`App ${appName} not found in nest-cli.json`);
    }

    entry = glob
      .sync(`${__dirname}/${nestJsProject.root}/src/handlers/*.ts`)
      .reduce((acc, /** @type String */ item) => {
        if (item.includes('.spec.ts')) return acc;
        // when command is start, we don't want to bundle the handlers, but only the main.ts
        // this also fixes the vscode debugger issue with multiple entry points
        if (command === 'start') return acc;

        const name = item
          .replace('.ts', '')
          .replace(__dirname, '')
          .split('/')
          .pop();
        acc[`apps/${appName}/${name}`] = item;
        return acc;
      }, {});

    entry[
      nestJsProject.root
    ] = `${__dirname}/${nestJsProject.root}/src/main.ts`;
  }

  apps.forEach((app) => {
    entry[`apps/${app}`] = `${__dirname}/apps/${app}/src/main.ts`;
  });

  entry['webpack/hot/poll?100'] = 'webpack/hot/poll?100';

  /**
   * These are the default nest options that we extrapolated from the nest build command
   * However, we want to run webpack using the official cli, that's why we need to define
   * these configs here
   */
  /** @type {import('webpack').Configuration} */
  const defaultNest = {
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
                configFile: `${__dirname}/tsconfig.json`,
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
          // exclude: {},
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
      plugins: [
        // new TsconfigPathsPlugin({
        //   configFile: `${__dirname/tsconfig.app.json`,
        // }),
      ],
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
      new ForkTsCheckerWebpackPlugin({
        async: false, // we need it to catch the errors before the compilation ends
        typescript: {
          configFile: `${__dirname}/tsconfig.json`,
          // mode: 'write-references',
          // build: true,
        },
      }),
      new webpack.WatchIgnorePlugin({
        paths: [/\.js$/, /\.d\.ts$/],
      }),
    ],
    // do not use nest options to avoid having different
    // options between nest build and webpack native build
    // ...options,
  };

  const isProd = process.env.NODE_ENV === 'production';

  console.log('Project name', appName);
  console.log('Command', command);
  console.log(`Building in ${isProd ? 'production' : 'development'} mode`);

  /** @type {import('webpack').Configuration} */
  const config = {
    ...defaultNest,
    context: __dirname,
    output: {
      ...(defaultNest.output ?? {}),
      // the file should reside in a folder with its own name
      filename: `${ROOT_DIR}[name]/main.cjs`,
      path: `${__dirname}/dist`,
      /**
       * ESM and CommonJS code can't be bundled together without
       * transforming ESM to commonjs.
       * We need to keep this setting
       */
      library: {
        type: 'commonjs2',
      },
      // chunkFormat: 'module',
    },
    // experiments: {
    //   outputModule: true,
    // },
    optimization: {
      ...defaultNest.optimization,
      /**
       * Keep the node_modules in a separate chunk to share them between apps
       * and save compilation time
       */
      splitChunks: {
        ...defaultNest.optimization?.splitChunks,
        cacheGroups: {
          ...defaultNest.optimization?.splitChunks?.cacheGroups,
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            filename: `opt/vendors/modules.cjs`,
            chunks: 'all',
            reuseExistingChunk: true,
          },
        },
      },
    },
    entry,
    devtool: isProd
      ? false /* 'inline-cheap-module-source-map' */
      : 'source-map',
    mode: isProd ? 'production' : 'development',
    plugins: [
      ...(defaultNest.plugins ?? []),
      new webpack.ProgressPlugin({
        handler: (percentage, message, ...args) => {
          // e.g. Output each progress message directly to the console:
          console.info(percentage, message, ...args);
        },
      }),
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
    ],
  };

  /**
   * Visualizer plugin
   * @see https://github.com/jonamat/webpack-visualizer-plugin2
   */
  if (process.env.NEST_WEBPACK_VISUALIZER === 'true') {
    config.plugins.push(
      new Visualizer({
        filename: `${__dirname}/var/webpack-stats.html`,
      }),
    );
  }

  if (isProd) {
    /**
     * PROD
     */

    config.optimization = {
      ...config.optimization,
      minimize: true,
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

    config.cache = {
      type: 'filesystem',
      version: '1',
    };

    /**
     * By enabling the nodeExternals we have the following error on some dependencies:
     * Error [ERR_REQUIRE_ESM]: require() of ES Module
     * This is because of ESM and CJS incompatibility
     * TODO: investigate on it. Enabling nodeExternals is a good practice in dev because it speeds up the compilation time
     */
    config.externals = [...externals, ...devDeps];
    config.optimization = {
      ...config.optimization,
      removeAvailableModules: false,
      removeEmptyChunks: false,
      // runtimeChunk: true,
      /**
       * Create chunks for everything to speedup the compilation time
       */
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          libs: {
            test: /[\\/]libs[\\/]/,
            name: 'libs',
            filename: `opt/libs/libs.cjs`,
            chunks: 'all',
            reuseExistingChunk: true,
          },
          deps: {
            test: /[\\/]deps[\\/]/,
            name: 'deps',
            filename: `opt/deps/deps.cjs`,
            chunks: 'all',
            reuseExistingChunk: true,
          },
          apps: {
            test: /[\\/]apps[\\/]/,
            name: 'apps',
            filename: `opt/apps/apps.cjs`,
            chunks: 'all',
            reuseExistingChunk: true,
          },
        },
      },
    };

    // rimraf dist folder, clean: true is not always working
    console.log(`Cleaning ${config.output.path} folder`);
    if (cleanFolder) execSync(`npx -y rimraf ${config.output.path}`);

    config.output = {
      ...config.output,
      pathinfo: false,
      clean: cleanFolder,
    };
  }

  // uncomment to check what's the result of the webpack config
  // console.log('Webpack Config', JSON.stringify(config, null, 2));
  // process.exit(0);

  // This logic is needed by the root webpack config
  // to detect if the build passed
  config.plugins.push(function () {
    this.hooks.done.tapAsync('shutdown', function (stats, callback) {
      console.log(`==== Running NestJS actions for ${appName} ====`);
      if (appName === 'all') {
        Object.keys(nestCliJson.projects).forEach((project) => {
          runNestJsActions(project);
        });
      } else {
        runNestJsActions(appName);
      }

      // console.log(stats.compilation.errors);
      if (stats.compilation.errors.length > 0 || !global.buildEmitter) {
        callback();
        return;
      }

      callback();
    });
  });

  return config;
};
