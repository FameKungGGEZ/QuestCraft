import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        "admin-login": resolve(root, 'pages/admin-login/index.html'),
        "admin-settings": resolve(root, 'pages/admin-settings/index.html'),
        "admin-spin": resolve(root, 'pages/admin-spin/index.html'),
        "jzp8xu8vxtnljhwctkswiq": resolve(root, 'pages/jzp8xu8vxtnljhwctkswiq/index.html'),
        "leaderboard": resolve(root, 'pages/leaderboard/index.html'),
        "ocrta4uzpphn1rqacjjejw": resolve(root, 'pages/ocrta4uzpphn1rqacjjejw/index.html'),
        "present-spin": resolve(root, 'pages/present-spin/index.html'),
        "quest-map": resolve(root, 'pages/quest-map/index.html'),
        "register": resolve(root, 'pages/register/index.html'),
        "review-submissions": resolve(root, 'pages/review-submissions/index.html'),
        "teams": resolve(root, 'pages/teams/index.html'),
        "untitled": resolve(root, 'pages/untitled/index.html'),
      },
    },
  },
})
