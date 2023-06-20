module.exports = [
  {
    path: ['index.js'],
    import: '*',
    modifyEsbuildConfig(cfg) {
      return { ...cfg, format: 'esm', target: 'esnext', packages: 'external' };
    },
  },
];
