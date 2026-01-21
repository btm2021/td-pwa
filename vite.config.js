import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'
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
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'TradingView PWA',
        short_name: 'TradingApp',
        description: 'Professional trading application with advanced charting',
        theme_color: '#0B0B0E',
        background_color: '#0B0B0E',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
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
