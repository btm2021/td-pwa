import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { resolve } from 'path'
import { createReadStream, existsSync, statSync } from 'fs'
import { VitePWA } from 'vite-plugin-pwa'

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
      includeAssets: ['favicon.ico', 'icon.png'],
      manifest: {
        name: 'TD Trading',
        short_name: 'TDT',
        description: 'Advanced Trading Platform',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        icons: [
          {
            src: 'icon.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: [], // Disable precaching of source code
        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              request.destination === 'script' ||
              request.destination === 'style' ||
              request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'source-code-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 1 day cleanup
              },
              networkTimeoutSeconds: 5
            }
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
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
