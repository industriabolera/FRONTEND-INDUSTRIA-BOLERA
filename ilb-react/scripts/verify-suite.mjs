/* global process */
/**
 * Suite de verificación canónica de ILB (`npm run verify`).
 *
 * Comprueba, sobre el servidor Express real en `NODE_ENV=production`:
 *   1. que `dist/` esté compilado (si no, ejecuta `vite build`);
 *   2. el contrato HTTP de rutas SPA, 404, assets y health;
 *   3. la política SEO de la 404 (noindex, sin canonical ni og:url de la home);
 *   4. el conteo de `<h1>` por componente JSX.
 *
 * Uso (desde ilb-react): node scripts/verify-suite.mjs
 * Puerto configurable con VERIFY_PORT (por defecto 4888).
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const distDir = join(root, 'dist')
const distIndex = join(distDir, 'index.html')
const PORT = Number(process.env.VERIFY_PORT) || 4888
const BASE_URL = `http://127.0.0.1:${PORT}`
const FETCH_TIMEOUT_MS = 10000

let passed = 0
let failed = 0

function ok(label, detail = '') {
  passed++
  console.log(`  PASS  ${label}${detail ? ` — ${detail}` : ''}`)
}

function ko(label, detail = '') {
  failed++
  console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`)
}

function assert(condition, label, detail = '') {
  if (condition) ok(label, detail)
  else ko(label, detail)
}

// ─── 1. dist/ compilado ──────────────────────────────────────
function newestMtime(path) {
  const stats = statSync(path)
  if (!stats.isDirectory()) return stats.mtimeMs
  let newest = 0
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue
    newest = Math.max(newest, newestMtime(join(path, entry.name)))
  }
  return newest
}

function distUpToDate() {
  if (!existsSync(distIndex)) return false
  const distTime = statSync(distIndex).mtimeMs
  const sources = [join(root, 'index.html'), join(root, 'vite.config.js'), join(root, 'src')]
  return sources.every(source => !existsSync(source) || newestMtime(source) <= distTime)
}

function ensureDist() {
  if (distUpToDate()) {
    ok('dist/index.html actualizado', 'se reutiliza el build existente')
    return
  }
  console.log('  · dist/ ausente o desactualizado → ejecutando vite build')
  const result = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' })
  if (result.status !== 0 || !existsSync(distIndex)) {
    throw new Error('vite build falló o no generó dist/index.html')
  }
  ok('vite build', 'dist/index.html generado')
}

// ─── 2. Servidor Express real ────────────────────────────────
async function startServer() {
  process.env.NODE_ENV = 'production'
  const { app } = await import('../server/index.js')
  const server = app.listen(PORT, '127.0.0.1')
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  return server
}

function request(path, options = {}) {
  return fetch(`${BASE_URL}${path}`, {
    redirect: 'manual',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    ...options,
  })
}

function assertHtml404(label, res, body) {
  assert(res.status === 404, `${label} → 404`, `status=${res.status}`)
  const robotsHeader = res.headers.get('x-robots-tag') || ''
  assert(
    robotsHeader.includes('noindex') && robotsHeader.includes('nofollow'),
    `${label} → X-Robots-Tag: noindex, nofollow`,
    `recibido="${robotsHeader}"`
  )
  assert(
    /noindex,\s*nofollow/i.test(body),
    `${label} → body con noindex, nofollow`
  )
  assert(
    !/<link[^>]+rel=["']canonical["']/i.test(body),
    `${label} → sin canonical a la home`
  )
  assert(
    !/<meta[^>]+property=["']og:url["']/i.test(body),
    `${label} → sin og:url a la home`
  )
}

async function verifyHttp() {
  const htmlRoutes = ['/', '/servicios', '/reservas?ref=abc123', '/admin', '/blog', '/blog/guia-bolos-principiantes-tecnica']
  for (const route of htmlRoutes) {
    const res = await request(route)
    const type = res.headers.get('content-type') || ''
    assert(res.status === 200 && type.includes('text/html'), `GET ${route} → 200 text/html`, `status=${res.status} type="${type}"`)
  }

  const notFound = await request('/ruta-inexistente-xyz-123')
  assertHtml404('GET /ruta-inexistente-xyz-123', notFound, await notFound.text())

  const subroute = await request('/servicios/subruta-invalida')
  assertHtml404('GET /servicios/subruta-invalida', subroute, await subroute.text())

  const blogSlugNotFound = await request('/blog/slug-inexistente-404')
  assertHtml404('GET /blog/slug-inexistente-404', blogSlugNotFound, await blogSlugNotFound.text())

  const missingJs = await request('/assets/inexistente.js')
  const missingJsType = missingJs.headers.get('content-type') || ''
  assert(
    missingJs.status === 404 && missingJsType.includes('text/plain'),
    'GET /assets/inexistente.js → 404 text/plain',
    `status=${missingJs.status} type="${missingJsType}"`
  )

  const missingPng = await request('/images/inexistente.png')
  const missingPngType = missingPng.headers.get('content-type') || ''
  assert(
    missingPng.status === 404 && missingPngType.includes('text/plain'),
    'GET /images/inexistente.png → 404 text/plain',
    `status=${missingPng.status} type="${missingPngType}"`
  )

  const health = await request('/api/health')
  const healthType = health.headers.get('content-type') || ''
  assert(
    health.status === 200 && healthType.includes('application/json'),
    'GET /api/health → 200 application/json',
    `status=${health.status} type="${healthType}"`
  )

  const headNotFound = await request('/ruta-inexistente-xyz-123', { method: 'HEAD' })
  assert(headNotFound.status === 404, 'HEAD /ruta-inexistente-xyz-123 → 404', `status=${headNotFound.status}`)
}

// ─── 3. Conteo de <h1> en componentes JSX ────────────────────
const H1_EXPECTATIONS = [
  ['src/components/HeroSection.jsx', 1],
  ['src/components/pages/ContactoPage.jsx', 1],
  ['src/components/pages/servicios/ServiciosTipsSection.jsx', 1],
  ['src/components/pages/servicios/ServiciosMenuSection.jsx', 0],
  ['src/components/pages/servicios/ServiciosExtrasSection.jsx', 0],
  ['src/components/pages/SobreNosotrosPage.jsx', 1],
  ['src/components/pages/BlogPage.jsx', 1],
  ['src/components/pages/BlogPostPage.jsx', 1],
  ['src/components/pages/FaqPage.jsx', 1],
  ['src/components/pages/CumpleanosPage.jsx', 1],
  ['src/components/ReservasPage.jsx', 1],
]

function countH1(source) {
  const matches = source.match(/<h1(?=[\s>])/g)
  return matches ? matches.length : 0
}

function verifyH1() {
  for (const [relative, expected] of H1_EXPECTATIONS) {
    const absolute = join(root, relative)
    if (!existsSync(absolute)) {
      ko(`<h1> ${relative} → ${expected}`, 'archivo no encontrado')
      continue
    }
    const found = countH1(readFileSync(absolute, 'utf8'))
    assert(found === expected, `<h1> ${relative} → ${expected}`, `encontrados=${found}`)
  }
}

// ─── Ejecución ───────────────────────────────────────────────
async function main() {
  console.log(`\n▶ Verificación ILB (${BASE_URL})\n`)

  ensureDist()

  const server = await startServer()
  try {
    await verifyHttp()
  } finally {
    await new Promise(resolve => server.close(resolve))
  }

  verifyH1()

  console.log(`\n${failed === 0 ? '✅' : '❌'} ${passed} PASS · ${failed} FAIL\n`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch(err => {
  console.error(`\n❌ Verificación interrumpida: ${err.message}\n`)
  process.exit(1)
})
