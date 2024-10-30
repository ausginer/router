/* eslint-disable import/prefer-default-export,import/unambiguous */
declare module '@remcovaes/web-test-runner-vite-plugin' {
  import type { TestRunnerPlugin } from '@web/test-runner';
  import type { UserConfig } from 'vite';

  export function vitePlugin(config?: UserConfig): () => TestRunnerPlugin;
}
