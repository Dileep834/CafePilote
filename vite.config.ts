import type { IncomingMessage } from 'node:http'
import { pathToFileURL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

function localPaymentApiPlugin(): Plugin {
  const routes: Record<string, string> = {
    '/api/payment-gateways/create': 'api/payment-gateways/create.js',
    '/api/payment-gateways/status': 'api/payment-gateways/status.js',
    '/api/payment-gateways/settings': 'api/payment-gateways/settings.js',
    '/api/payment-gateways/callback': 'api/payment-gateways/callback.js',
  }

  return {
    name: 'cafepilots-local-payment-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const requestUrl = new URL(req.url || '/', 'http://localhost')
        const route = routes[requestUrl.pathname]
        if (!route) {
          next()
          return
        }

        try {
          ;(req as IncomingMessage & { query?: Record<string, string> }).query = Object.fromEntries(
            requestUrl.searchParams.entries()
          )
          const moduleUrl = pathToFileURL(path.resolve(__dirname, route)).href
          const mod = await import(`${moduleUrl}?t=${Date.now()}`)
          await mod.default(req, res)
        } catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(
            JSON.stringify({
              ok: false,
              code: 'LOCAL_API_ERROR',
              message: error instanceof Error ? error.message : 'Local API failed.',
            })
          )
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localPaymentApiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
