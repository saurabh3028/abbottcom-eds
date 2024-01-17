import fs from 'fs';
// eslint-disable-next-line import/no-extraneous-dependencies
import { build } from 'esbuild';

const BANNER = `/* eslint-disable */
/* Generated by Milo */
`;

const ICONS = [
  'asterisk', 'chevron', 'checkmark', 'dash',
];

const LIT_PATH_PATTERN = /^lit(\/.*)?$/;
const ICON_PATH_PATTERN = /^@spectrum-web-components\/icon\/src\/spectrum-icon-(.*).css.js/;
const SWC_BASE_PATH = '/libs/features/spectrum-web-components';

const IGNORE_PATHS = [
  '@spectrum-web-components/modal/src/modal-wrapper.css.js',
  '@spectrum-web-components/modal/src/modal.css.js',
];

const TARGET = 'es2021';

const DEFINE = { 'process.env.NODE_ENV': '"development"' };

function rewriteImports() {
  return {
    name: 'rewrite-imports',
    // eslint-disable-next-line no-shadow
    setup(build) {
      // eslint-disable-next-line consistent-return
      build.onResolve({ filter: /.*/ }, (args) => {
        /* Spectrum Web Components */
        // if path is for another module, rewrite it as external
        let [entry] = build.initialOptions.entryPoints;
        ([entry] = entry.replace('./src/', '').split('.'));

        if (LIT_PATH_PATTERN.test(args.path)) {
          return {
            path: '/libs/deps/lit-all.min.js',
            external: true,
          };
        }
        if (ICON_PATH_PATTERN.test(args.path)) {
          const iconName = args.path.match(ICON_PATH_PATTERN)[1];
          return {
            path: `${SWC_BASE_PATH}/dist/icons/${iconName}.js`,
            external: true,
          };
        }

        if (/@spectrum-web-components/.test(args.path) && args.path.indexOf(`@spectrum-web-components/${entry}`) < 0 && !IGNORE_PATHS.includes(args.path)) {
          // get the first folder after @spectrum-web-components
          const [, module] = args.path.split('/');
          return {
            path: `${SWC_BASE_PATH}/dist/${module}.js`,
            external: true,
          };
        }
        return undefined;
      });
    },
  };
}

const mods = fs.readdirSync('./src');

build({
  define: DEFINE,
  bundle: true,
  banner: { js: BANNER },
  entryPoints: ['./src/lit.js'],
  platform: 'browser',
  format: 'esm',
  sourcemap: false,
  target: TARGET,
  minify: true,
  outfile: '../../deps/lit-all.min.js',
});

mods.forEach((mod) => {
  if (mod === 'lit.js') return;
  build({
    define: DEFINE,
    bundle: true,
    banner: { js: BANNER },
    entryPoints: [`./src/${mod}`],
    platform: 'browser',
    format: 'esm',
    sourcemap: false,
    legalComments: 'none',
    target: TARGET,
    minify: true,
    plugins: [rewriteImports()],
    outfile: `./dist/${mod}`,
  });
});

ICONS.forEach((icon) => {
  build({
    define: DEFINE,
    bundle: true,
    banner: { js: BANNER },
    entryPoints: [`./node_modules/@spectrum-web-components/icon/src/spectrum-icon-${icon}.css.js/`],
    platform: 'browser',
    format: 'esm',
    sourcemap: false,
    legalComments: 'none',
    target: TARGET,
    minify: true,
    outfile: `./dist/icons/${icon}.js`,
  });
});
