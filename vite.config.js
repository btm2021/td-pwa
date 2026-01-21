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
      devOptions: {
        enabled: true
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Mint Hunter',
        short_name: 'Mint',
        description: 'Professional trading application with advanced charting',
        theme_color: '#0B0B0E',
        background_color: '#0B0B0E',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
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
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fstream\.binance\.com\/.*/i,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'binance-websocket'
            }
          },
          {
            urlPattern: /^https:\/\/huobicfg\.s3\.amazonaws\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'coin-icons',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
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
