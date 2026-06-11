/* eslint-disable no-console */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, 'manual-images')
const URL = process.env.ADMIN_URL || 'https://laindustriabolera.co/admin'
const PASS = process.env.ADMIN_PASS
if (!PASS) {
  console.error('Define ADMIN_PASS en el entorno (contraseña del panel admin).')
  process.exit(1)
}

const VIEWPORT = { width: 1440, height: 900 }

async function shot(page, name, opts = {}) {
  const path = resolve(OUT, name)
  await page.screenshot({ path, ...opts })
  console.log('✓', name)
}

async function fullSection(page, name, opts = {}) {
  await page.screenshot({ path: resolve(OUT, name), fullPage: true, ...opts })
  console.log('✓', name)
}

async function viewportShot(page, name) {
  await page.screenshot({ path: resolve(OUT, name), fullPage: false })
  console.log('✓', name)
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 })
  const page = await ctx.newPage()

  console.log('▶ Navegando a', URL)
  await page.goto(URL, { waitUntil: 'networkidle' })

  await page.waitForSelector('.admin-login-card')
  await fullSection(page, '01-login.png')

  await page.fill('.admin-login-form input[type="password"]', PASS)
  await shot(page, '01b-login-typed.png', { clip: await getClip(page, '.admin-login-card') })
  await page.click('.admin-login-form button[type="submit"]')
  await page.waitForSelector('.admin-sidebar')
  await page.waitForTimeout(2500)

  // Dashboard
  await fullSection(page, '02-dashboard.png')

  // Dashboard con detalle expandido
  const expandBtn = page.locator('.dash-expand-btn').first()
  if (await expandBtn.count()) {
    await expandBtn.click()
    await page.waitForTimeout(400)
    await fullSection(page, '02b-dashboard-detail.png')
    await expandBtn.click()
  }

  // Precios
  await page.click('.admin-nav-item:has-text("Precios")')
  await page.waitForTimeout(600)
  await fullSection(page, '03-precios.png')

  // Promociones
  await page.click('.admin-nav-item:has-text("Promociones")')
  await page.waitForTimeout(600)
  await fullSection(page, '04-promociones.png')
  // Abrir formulario
  await page.click('button:has-text("Nueva Promoción")')
  await page.waitForTimeout(400)
  await fullSection(page, '04b-promociones-form.png')
  await page.click('button:has-text("Cancelar")')

  // Pistas (lista puede ser muy larga, sólo viewport)
  await page.click('.admin-nav-item:has-text("Pistas")')
  await page.waitForTimeout(600)
  await viewportShot(page, '05-pistas.png')
  await page.click('button:has-text("Bloquear Pista")')
  await page.waitForTimeout(500)
  // El form completo (incluye plano de pistas)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(200)
  await viewportShot(page, '05b-pistas-bloquear.png')
  // Hacer scroll al plano para capturar el FloorPlan
  await page.locator('.admin-floorplan-wrapper').scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)
  await viewportShot(page, '05c-pistas-plano.png')
  await page.click('button:has-text("Cancelar")')

  // Reservas
  await page.click('.admin-nav-item:has-text("Reservas")')
  await page.waitForTimeout(800)
  await viewportShot(page, '06-reservas.png')
  // Abrir detalle expandido de la primera reserva
  const firstCard = page.locator('.admin-reserva-summary').first()
  if (await firstCard.count()) {
    await firstCard.click()
    await page.waitForTimeout(400)
    await fullSection(page, '06b-reservas-detalle.png')
  }
  // Formulario nueva reserva
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.locator('button:has-text("Nueva Reserva")').click()
  await page.waitForTimeout(400)
  await viewportShot(page, '06c-reservas-form.png')

  await browser.close()
  console.log('✔ Capturas listas en', OUT)
}

async function getClip(page, sel) {
  const box = await page.locator(sel).boundingBox()
  if (!box) return undefined
  return { x: box.x, y: box.y, width: box.width, height: box.height }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
