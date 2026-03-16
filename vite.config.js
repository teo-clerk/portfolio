import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Three.js into its own chunk — ~600 KB; never needed before first paint
          if (id.includes('three')) return 'three';
          // React core in one stable chunk
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'react-vendor';
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
  },
})
