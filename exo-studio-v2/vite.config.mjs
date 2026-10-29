import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), {
    name: 'exo-native-node-util-browser-guard',
    enforce: 'pre',
    resolveId(source, importer, options) {
      // Native source fixture/grade sidecar safety guards require Node's
      // util.types.isProxy. In a browser there is no equivalent. Keep direct
      // Node imports intact for native QA, and fail closed if a web UI tries
      // to invoke one of these Node-only grade validators.
      if (!options?.ssr && source === 'node:util' &&
          /[/\\]src[/\\]core[/\\]/.test(importer || '')) {
        return '\0exo-node-util-browser-guard'
      }
      return null
    },
    load(id) {
      if (id === '\0exo-node-util-browser-guard')
        return `export const types = Object.freeze({isProxy() { throw new Error('EXO native grade safety validation requires Node and is unavailable in the browser. No grading changes were applied.') }})`
      return null
    },
  }],
  server: {
    host: '127.0.0.1',
    port: 5188,
  },
})
