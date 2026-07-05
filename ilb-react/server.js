// Punto de entrada para Hostinger (hPanel → Archivo de entrada: server.js)
console.log('[ILB] Starting server.js…')
process.env.NODE_ENV ||= 'production'

process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err)
  process.exit(1)
})

process.on('unhandledRejection', (err) => {
  console.error('[FATAL] unhandledRejection:', err)
  process.exit(1)
})

await import('./server/index.js')
