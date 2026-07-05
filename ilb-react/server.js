// Punto de entrada para Hostinger (hPanel → Archivo de entrada: server.js)
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = join(__dirname, 'dist')

process.env.NODE_ENV = String(process.env.NODE_ENV || 'production').toLowerCase()
console.log('[ILB] Starting server.js')
console.log('[ILB] NODE_ENV=', process.env.NODE_ENV)
console.log('[ILB] PORT=', process.env.PORT || '(Hostinger asignará uno)')
console.log('[ILB] cwd=', process.cwd())
console.log('[ILB] dist exists=', existsSync(distDir), distDir)

process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err)
  process.exit(1)
})

process.on('unhandledRejection', (err) => {
  console.error('[FATAL] unhandledRejection:', err)
  process.exit(1)
})

await import('./server/index.js')
