import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite is the dev server and bundler. Plugins teach it new file types:
// - react: understands JSX/TSX and enables fast refresh while you edit
// - tailwindcss: scans the source for class names and generates the CSS
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
