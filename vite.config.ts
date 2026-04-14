import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  base: "/license-writer/",
  plugins: [react(), nodePolyfills({ include: ['buffer', 'stream', 'util', 'assert', 'events'] })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Pre-bundle SAID + canonical JSON deps (saidify pulls buffer);
  // avoids flaky dev-server resolution.
  optimizeDeps: {
    include: ['saidify', 'json-canonicalize', 'buffer'],
  },
})
