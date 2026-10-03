import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages serves the project site from /<repo>/, not the domain root.
  // The dev server stays at / so localhost URLs are unchanged.
  base: command === 'build' ? '/leetcode2/' : '/',
}))
