module.exports = [
  {
    name: 'Bare',
    path: ['index.js'],
    import: '*',
    modifyEsbuildConfig(cfg) {
      return { ...cfg, format: 'esm', target: 'esnext', packages: 'external' };
    },
  },
  {
    name: 'With Polyfill',
    path: ['index.js'],
    import: '*',
    modifyEsbuildConfig(cfg) {
      return { ...cfg, format: 'esm', target: 'esnext' };
    },
  }
];
