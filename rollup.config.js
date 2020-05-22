// rollup.config.js
export default {
    input: 'xen/main.js',
    output: {
      file: 'xen-pkg.js',
      format: 'umd',
      name: 'xen'
    }
  };