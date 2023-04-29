if (!('URLPattern' in globalThis)) {
  await import('urlpattern-polyfill');
}

export * from './navigation.js';
export * from './Router.js';
