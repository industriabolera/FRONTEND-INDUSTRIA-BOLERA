import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  DEFAULT_SOCIAL_IMAGE,
  buildLocalBusinessSchema,
  resolveSeoRoute,
} from '../../config/seoRoutes'

const SCHEMA_SCRIPT_ID = 'schema-local-business'

/**
 * Crea, actualiza o elimina (cuando `content` es nulo/vacío) una etiqueta
 * <meta> identificada por un atributo (`name` o `property`).
 */
function setMeta(attribute, key, content) {
  const selector = `meta[${attribute}="${key}"]`
  const existing = document.head.querySelector(selector)

  if (content === null || content === undefined || content === '') {
    if (existing) existing.remove()
    return
  }

  if (existing) {
    existing.setAttribute('content', content)
    return
  }

  const meta = document.createElement('meta')
  meta.setAttribute(attribute, key)
  meta.setAttribute('content', content)
  document.head.appendChild(meta)
}

/** Crea, actualiza o elimina el <link rel="canonical">. */
function setCanonical(href) {
  const existing = document.head.querySelector('link[rel="canonical"]')

  if (!href) {
    if (existing) existing.remove()
    return
  }

  if (existing) {
    existing.setAttribute('href', href)
    return
  }

  const link = document.createElement('link')
  link.setAttribute('rel', 'canonical')
  link.setAttribute('href', href)
  document.head.appendChild(link)
}

/** Crea, actualiza o elimina el bloque JSON-LD identificado por `id`. */
function setJsonLd(id, data) {
  const existing = document.getElementById(id)

  if (!data) {
    if (existing) existing.remove()
    return
  }

  const script = existing || document.createElement('script')
  script.id = id
  script.type = 'application/ld+json'
  script.textContent = JSON.stringify(data)

  if (!existing) document.head.appendChild(script)
}

/**
 * Gestor SEO centralizado. Sincroniza <head> de forma idempotente en cada
 * cambio de ruta: título, description, canonical, robots, Open Graph, Twitter,
 * metadatos de artículo y el JSON-LD correspondiente (`BowlingAlley` en páginas
 * públicas indexables, `BlogPosting` en artículos del blog).
 *
 * Reescribe siempre robots y canonical (incluida su eliminación), de modo que
 * al volver de /admin o páginas legales a la home no quede un `noindex` residual.
 */
export default function SeoManager() {
  const { pathname } = useLocation()

  useEffect(() => {
    const seo = resolveSeoRoute(pathname)
    const socialImage = seo.image || DEFAULT_SOCIAL_IMAGE

    document.title = seo.title

    setMeta('name', 'description', seo.description)
    setCanonical(seo.canonical)
    setMeta('name', 'robots', seo.robots)

    // Open Graph
    setMeta('property', 'og:title', seo.title)
    setMeta('property', 'og:description', seo.description)
    setMeta('property', 'og:url', seo.canonical)
    setMeta('property', 'og:image', socialImage)
    setMeta('property', 'og:type', seo.ogType || 'website')

    // Metadatos de artículo (solo en posts de blog)
    const article = seo.ogType === 'article' ? seo.article : null
    setMeta('property', 'article:published_time', article?.publishedTime)
    setMeta('property', 'article:section', article?.category)

    // Twitter Cards
    setMeta('name', 'twitter:title', seo.title)
    setMeta('name', 'twitter:description', seo.description)
    setMeta('name', 'twitter:image', socialImage)
    setMeta('name', 'twitter:card', 'summary_large_image')

    // `schema: true` inyecta el JSON-LD BowlingAlley; un objeto se usa tal cual.
    const schemaData = seo.schema === true ? buildLocalBusinessSchema() : seo.schema || null
    setJsonLd(SCHEMA_SCRIPT_ID, schemaData)
  }, [pathname])

  return null
}
