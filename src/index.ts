if (!('URLPattern' in globalThis)) {
  await import('urlpattern-polyfill');
}

export type { EmptyObject } from 'type-fest';
export * from './navigation.js';
export * from './Router.js';
