import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { esbuildPlugin } from '@web/dev-server-esbuild';
import { chromeLauncher } from '@web/test-runner';
import { glob } from 'glob';

const root = new URL('./', import.meta.url);

const {
  values: { coverage, watch: _watch },
} = parseArgs({
  options: {
    watch: {
      type: 'boolean',
      short: 'w',
    },
    coverage: {
      type: 'boolean',
    },
  },
  strict: false,
});

const isCI = !!process.env.CI;
const watch = !!_watch && !isCI;

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  concurrency: 10,
  nodeResolve: true,
  watch,
  coverage,
  rootDir: fileURLToPath(root),
  coverageConfig: {
    include: [fileURLToPath(new URL('src/**/*', root))],
    reportDir: fileURLToPath(new URL('.coverage/', root)),
  },
  files: await glob('./test/**/*.spec.ts', { cwd: root }),
  plugins: [esbuildPlugin({ ts: true })],
  browsers: [
    chromeLauncher({
      launchOptions: {
        args: [],
        // eslint-disable-next-line no-undef
        executablePath: process.env.CHROME_BIN,
      },
    }),
  ],
  testFramework: {
    config: {
      ui: 'bdd',
      timeout: '4000',
    },
  },
};
