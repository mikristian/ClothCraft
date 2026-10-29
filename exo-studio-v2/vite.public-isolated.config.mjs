import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The public source directory must be filtered before Vite copies static files.
// Never fall back to the private ./public directory in release mode.
const publicDir = process.env.CLOTHCRAFT_PUBLIC_DIR
const outDir = process.env.CLOTHCRAFT_PUBLIC_OUT
if (!publicDir || !outDir) {
  throw new Error('Set CLOTHCRAFT_PUBLIC_DIR and CLOTHCRAFT_PUBLIC_OUT for an isolated public build')
}
export default defineConfig({
  plugins: [react()],
  publicDir,
  base: './',
  build: { outDir, emptyOutDir: true, copyPublicDir: true, sourcemap: false },
})
