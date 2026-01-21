import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { resolve } from 'path'
import { createReadStream, existsSync, statSync } from 'fs'

// Custom plugin to serve chart library
function serveChartPlugin() {
  return {
    name: 'serve-chart',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Check if request is for /chart/*
        if (req.url && req.url.startsWith('/chart/')) {
          const relativePath = req.url.replace('/chart/', '')
          const filePath = resolve(process.cwd(), 'chart', relativePath)

          if (existsSync(filePath) && statSync(filePath).isFile()) {
            // Set content type based on extension
            const ext = filePath.split('.').pop().toLowerCase()
            const mimeTypes = {
              'js': 'application/javascript',
              'mjs': 'application/javascript',
              'css': 'text/css',
              'html': 'text/html',
              'json': 'application/json',
              'png': 'image/png',
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'svg': 'image/svg+xml',
              'ico': 'image/x-icon',
              'woff': 'font/woff',
              'woff2': 'font/woff2',
              'ttf': 'font/ttf',
            }

            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
            res.setHeader('Cache-Control', 'public, max-age=31536000')
            createReadStream(filePath).pipe(res)
            return
          }
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    preact(),
    serveChartPlugin(),
  ],
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
  },
  publicDir: 'public',
})
