const esbuild = require('esbuild');

// Build background and UI scripts as ES modules
esbuild.build({
  entryPoints: ['popup.js', 'background.js', 'audio.js', 'offscreen.js'],
  bundle: true,
  outdir: 'dist',
  minify: false,
  sourcemap: true,
  format: 'esm',
  target: ['chrome100']
}).catch(() => process.exit(1));

// Build content script as IIFE (no exports)
esbuild.build({
  entryPoints: ['content.js'],
  bundle: true,
  outdir: 'dist',
  minify: false,
  sourcemap: true,
  format: 'iife',
  target: ['chrome100']
}).catch(() => process.exit(1));
