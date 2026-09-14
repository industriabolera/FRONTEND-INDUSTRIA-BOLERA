// Hostinger carga este entrypoint con require(); el servidor es ESM y usa top-level await.
import('./server.js').catch((err) => {
  console.error('[ILB] Failed to start application:', err)
  process.exitCode = 1
})
