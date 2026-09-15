/**
 * Fuente de verdad compartida de las rutas públicas válidas del frontend.
 *
 * Sin dependencias de React ni de ningún framework: la consumen tanto el
 * enrutador de cliente (`src/App.jsx`) como el fallback SPA del servidor
 * Express (`server/index.js`), de modo que ambos coincidan al decidir si una
 * URL merece `200 OK` o `404 Not Found`.
 *
 * Las barras finales, los query strings (`?`) y los fragmentos (`#`) se
 * ignoran al comparar: `/reservas?ref=abc` y `/reservas/` resuelven a
 * `/reservas`.
 */

import { isValidBlogSlug } from '../content/blogData.js'

/** Rutas de navegación válidas (pathname normalizado, sin trailing slash salvo la raíz). */
export const FRONTEND_ROUTES = [
  '/',
  '/reservas',
  '/servicios',
  '/sobre-nosotros',
  '/contacto',
  '/blog',
  '/faq',
  '/cumpleanos',
  '/politica-de-privacidad',
  '/terminos-y-condiciones',
  '/politica-de-cookies',
  '/politica-tratamiento-datos',
  '/reglamento',
  '/admin',
]

const FRONTEND_ROUTE_SET = new Set(FRONTEND_ROUTES)

/**
 * Normaliza un pathname: descarta query/hash, asegura barra inicial y elimina
 * barras finales sobrantes (la raíz se conserva como `/`).
 */
export function normalizeFrontendPath(pathname) {
  if (typeof pathname !== 'string' || pathname === '') return '/'
  let path = pathname.split('?')[0].split('#')[0]
  if (!path.startsWith('/')) path = `/${path}`
  path = path.replace(/\/+$/, '')
  return path === '' ? '/' : path
}

/**
 * Indica si un pathname (con query/hash/trailing slash opcionales) es una ruta
 * válida: una ruta estática exacta o un artículo de blog publicado.
 */
export function isValidFrontendRoute(pathname) {
  const normalized = normalizeFrontendPath(pathname)

  if (FRONTEND_ROUTE_SET.has(normalized)) return true

  if (normalized.startsWith('/blog/')) {
    const slug = normalized.slice('/blog/'.length)
    if (slug && !slug.includes('/') && isValidBlogSlug(slug)) return true
  }

  return false
}
