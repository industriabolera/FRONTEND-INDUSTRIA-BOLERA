// Hostinger: hPanel → Preajuste EXPRESS (no Other) → Archivo de entrada: server.js
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = join(__dirname, 'dist')
const PORT = Number(process.env.PORT) || 3001

process.env.NODE_ENV = String(process.env.NODE_ENV || 'production').toLowerCase()

console.log('[ILB] boot server.js')
console.log('[ILB] NODE_ENV=', process.env.NODE_ENV)
console.log('[ILB] PORT=', process.env.PORT ?? '(auto)')
console.log('[ILB] cwd=', process.cwd())
console.log('[ILB] dist=', existsSync(distDir))

function startFallback(message, detail) {
  const app = express()
  app.get('/api/health', (_req, res) => {
    res.status(500).json({ status: 'error', message, detail })
  })
  app.use((_req, res) => {
    res.status(500).send(`ILB boot error: ${message}`)
  })
  app.listen(PORT, '0.0.0.0', () => {
    console.error('[ILB] Fallback server on', PORT, message, detail || '')
  })
}

try {
  const { startServer } = await import('./server/index.js')
  startServer()
} catch (err) {
  console.error('[ILB] Failed to load server/index.js:', err)
  startFallback('load_failed', err?.message || String(err))
}
