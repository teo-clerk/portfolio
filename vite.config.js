import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Enable CSS code-splitting so each lazy chunk carries only its own CSS
    cssCodeSplit: true,
    // Target modern browsers for smaller output (no legacy polyfills)
    target: 'es2020',
    // Minify with esbuild (default, fastest) — terser is slower with marginal gains
    minify: 'esbuild',
    // Do not ship source maps: they leak internal structure and add weight.
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Three.js into its own chunk — ~600 KB; never needed before first paint
          if (id.includes('three')) return 'three';
          // React core in one stable chunk
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'react-vendor';
          // Vercel analytics/speed-insights — non-critical, isolated chunk
          if (id.includes('@vercel')) return 'vercel-analytics';
          // Everything else in node_modules split by package name
          if (id.includes('node_modules')) {
            const pkg = id.toString().split('node_modules/')[1].split('/')[0];
            return `vendor-${pkg}`;
          }
        },
      },
    },
    // Increase chunk-size warning threshold (we know Three.js is large)
    chunkSizeWarningLimit: 800,
    // Inline small assets (< 8KB) as base64 data URIs to save HTTP requests
    assetsInlineLimit: 8192,
  },
  // Strip debug output from production bundles as a backstop, so a stray
  // console.log can never ship (and never runs in a hot render path).
  esbuild: {
    drop: ['debugger'],
    pure: ['console.log', 'console.debug'],
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})
