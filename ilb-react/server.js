// Hostinger: Preajuste EXPRESS → Archivo de entrada: app.js (o server.js)
import { existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = join(__dirname, 'dist')

// Hostinger asigna PORT — nunca hardcodear 3001 en producción
const PORT = Number(process.env.PORT)
if (!PORT) {
  console.warn('[ILB] PORT no definido por Hostinger, usando 3001 (solo local)')
}
const listenPort = PORT || 3001

process.env.NODE_ENV = String(process.env.NODE_ENV || 'production').toLowerCase()

console.log('[ILB] boot', new Date().toISOString())
console.log('[ILB] NODE_ENV=', process.env.NODE_ENV)
console.log('[ILB] PORT=', listenPort)
console.log('[ILB] cwd=', process.cwd())

if (!existsSync(distDir)) {
  console.log('[ILB] dist/ no existe, compilando…')
  execSync('npm run build', { stdio: 'inherit' })
}
console.log('[ILB] dist=', existsSync(distDir))

function startFallback(message, detail) {
  const app = express()
  app.get('/api/health', (_req, res) => {
    res.status(500).json({ status: 'error', message, detail })
  })
  app.use((_req, res) => {
    res.status(500).send(`ILB boot error: ${message}`)
  })
  app.listen(listenPort, '0.0.0.0', () => {
    console.error('[ILB] Fallback server on', listenPort, message, detail || '')
  })
}

try {
  const { startServer } = await import('./server/index.js')
  startServer()
} catch (err) {
  console.error('[ILB] Failed to load server/index.js:', err)
  startFallback('load_failed', err?.message || String(err))
}
