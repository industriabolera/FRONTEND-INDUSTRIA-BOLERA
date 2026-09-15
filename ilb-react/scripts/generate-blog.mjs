#!/usr/bin/env node
/**
 * generate-blog.mjs
 *
 * Compilador de contenido del blog de La Industria Bolera.
 *
 *  1. Lee todos los `.md` de `src/content/posts/`.
 *  2. Parsea frontmatter con `gray-matter` y cuerpo con `marked`.
 *  3. Sanitiza y valida campos obligatorios (slug unico, imagen local valida...).
 *  4. Escribe `src/content/blogData.js` con los exports de consumo.
 *  5. Actualiza `public/sitemap.xml` preservando las URLs estaticas existentes
 *     y agregando `/blog` + cada `/blog/<slug>`.
 *
 * Uso: node scripts/generate-blog.mjs   (o `npm run generate:blog`)
 */
import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import { marked } from 'marked'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')
const POSTS_DIR = join(PROJECT_ROOT, 'src', 'content', 'posts')
const OUTPUT_FILE = join(PROJECT_ROOT, 'src', 'content', 'blogData.js')
const PUBLIC_DIR = join(PROJECT_ROOT, 'public')
const SITEMAP_FILE = join(PUBLIC_DIR, 'sitemap.xml')

const SITE_ORIGIN = 'https://laindustriabolera.co'
const BLOG_PATH = `${SITE_ORIGIN}/blog`

const REQUIRED_FIELDS = [
  'title',
  'slug',
  'description',
  'date',
  'author',
  'category',
  'tags',
  'image',
  'imageAlt',
  'featured',
  'readingTime',
]

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const IMAGE_RE = /^\/images\/[A-Za-z0-9._/-]+$/

marked.setOptions({ gfm: true, breaks: false })

/* ------------------------------------------------------------------ */
/* Sanitizacion                                                        */
/* ------------------------------------------------------------------ */

/** Limpia texto de frontmatter: control chars, espacios redundantes. */
function sanitizeText(value) {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Sanitiza el HTML generado por marked: elimina etiquetas peligrosas,
 * atributos de evento y URLs `javascript:`.
 */
function sanitizeHtml(html) {
  return String(html)
    .replace(
      /<\s*(script|style|iframe|object|embed|form|link|meta|base)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
      '',
    )
    .replace(
      /<\s*(script|style|iframe|object|embed|form|link|meta|base)[^>]*\/?\s*>/gi,
      '',
    )
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"')
}

/* ------------------------------------------------------------------ */
/* Helpers de validacion                                               */
/* ------------------------------------------------------------------ */

function fail(errors, file, message) {
  errors.push(`${file}: ${message}`)
}

function toIsoDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  const raw = sanitizeText(value)
  if (!raw) return ''
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

function normalizeTags(value) {
  const list = Array.isArray(value)
    ? value
    : sanitizeText(value)
        .split(',')
        .map((tag) => tag.trim())
  return list
    .map((tag) => sanitizeText(tag))
    .filter((tag) => tag.length > 0)
}

function normalizeFeatured(value) {
  if (typeof value === 'boolean') return value
  const raw = sanitizeText(value).toLowerCase()
  if (raw === 'true' || raw === 'sí' || raw === 'si' || raw === '1') return true
  if (raw === 'false' || raw === 'no' || raw === '0') return false
  return null
}

function normalizeReadingTime(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return `${value} min`
  return sanitizeText(value)
}

/** Comprueba que la imagen sea local, exista y no escape de /public. */
function isValidLocalImage(image, errors, file) {
  if (!IMAGE_RE.test(image)) {
    fail(
      errors,
      file,
      `"image" debe ser una ruta local bajo /images/ (recibido: "${image}")`,
    )
    return false
  }
  const absolute = resolve(PUBLIC_DIR, `.${image}`)
  const publicRoot = resolve(PUBLIC_DIR) + sep
  if (!absolute.startsWith(publicRoot)) {
    fail(errors, file, `"image" intenta salir de /public ("${image}")`)
    return false
  }
  if (!existsSync(absolute) || !statSync(absolute).isFile()) {
    fail(errors, file, `la imagen "${image}" no existe en public${image}`)
    return false
  }
  return true
}

/* ------------------------------------------------------------------ */
/* Lectura y compilacion                                               */
/* ------------------------------------------------------------------ */

function readPostFiles() {
  if (!existsSync(POSTS_DIR)) {
    throw new Error(`No existe el directorio de contenido: ${POSTS_DIR}`)
  }
  return readdirSync(POSTS_DIR)
    .filter((name) => name.toLowerCase().endsWith('.md'))
    .sort((a, b) => a.localeCompare(b))
}

function compilePost(fileName) {
  const errors = []
  const filePath = join(POSTS_DIR, fileName)
  const raw = readFileSync(filePath, 'utf8')

  let parsed
  try {
    parsed = matter(raw)
  } catch (error) {
    throw new Error(`${fileName}: frontmatter YAML invalido (${error.message})`)
  }

  const data = parsed.data || {}
  for (const field of REQUIRED_FIELDS) {
    const value = data[field]
    const empty =
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '') ||
      (Array.isArray(value) && value.length === 0)
    if (empty) fail(errors, fileName, `falta el campo obligatorio "${field}"`)
  }

  const slug = sanitizeText(data.slug)
  if (slug && !SLUG_RE.test(slug)) {
    fail(
      errors,
      fileName,
      `"slug" invalido ("${slug}"): usa minusculas, numeros y guiones`,
    )
  }

  const title = sanitizeText(data.title)
  const description = sanitizeText(data.description)
  if (description && description.length < 50) {
    fail(
      errors,
      fileName,
      `"description" demasiado corta (${description.length} caracteres; minimo 50)`,
    )
  }

  const date = toIsoDate(data.date)
  if (!date) fail(errors, fileName, `"date" no es una fecha valida`)

  const author = sanitizeText(data.author)
  const category = sanitizeText(data.category)
  const image = sanitizeText(data.image)
  const imageAlt = sanitizeText(data.imageAlt)
  const tags = normalizeTags(data.tags)
  if (Array.isArray(data.tags) ? data.tags.length === 0 : !sanitizeText(data.tags)) {
    fail(errors, fileName, `"tags" debe contener al menos una etiqueta`)
  }

  const featured = normalizeFeatured(data.featured)
  if (featured === null) {
    fail(errors, fileName, `"featured" debe ser true o false`)
  }

  const readingTime = normalizeReadingTime(data.readingTime)
  if (image) isValidLocalImage(image, errors, fileName)

  const body = parsed.content || ''
  if (/^#\s+\S/m.test(body) || /^#\s+\S/.test(body.trim())) {
    fail(
      errors,
      fileName,
      'el markdown no debe incluir H1 (#); el titulo viene del frontmatter',
    )
  }
  if (!body.trim()) fail(errors, fileName, 'el cuerpo del articulo esta vacio')

  const html = body.trim() ? sanitizeHtml(marked.parse(body.trim())) : ''

  const meta = {
    slug,
    title,
    description,
    date,
    author,
    category,
    tags,
    image,
    imageAlt,
    featured: Boolean(featured),
    readingTime,
  }

  return { fileName, errors, meta, html }
}

function buildBlogModule(index, bySlug) {
  const banner = `// ARCHIVO GENERADO AUTOMATICAMENTE por scripts/generate-blog.mjs
// NO EDITAR A MANO. Ejecuta \`npm run generate:blog\` para regenerarlo.

`
  const functions = `
const BLOG_SLUGS = new Set(Object.keys(postsBySlug))

/**
 * Indica si un slug corresponde a un articulo publicado.
 * @param {string} slug
 * @returns {boolean}
 */
export function isValidBlogSlug(slug) {
  return typeof slug === 'string' && BLOG_SLUGS.has(slug)
}

/**
 * Devuelve todos los slugs publicados.
 * @returns {string[]}
 */
export function getAllBlogSlugs() {
  return [...BLOG_SLUGS]
}

/**
 * Devuelve el articulo destacado (entrada del indice, sin HTML).
 * @returns {object|null}
 */
export function getFeaturedPost() {
  return postsIndex.find((post) => post.featured) || null
}

/**
 * Devuelve las categorias unicas ordenadas alfabeticamente.
 * @returns {string[]}
 */
export function getCategories() {
  return [...new Set(postsIndex.map((post) => post.category))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  )
}
`
  return (
    banner +
    `export const postsIndex = ${JSON.stringify(index, null, 2)}\n\n` +
    `export const postsBySlug = ${JSON.stringify(bySlug, null, 2)}\n` +
    functions
  )
}

/* ------------------------------------------------------------------ */
/* Sitemap                                                             */
/* ------------------------------------------------------------------ */

function renderBlogUrl(loc) {
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    '    <changefreq>weekly</changefreq>',
    '    <priority>0.7</priority>',
    '  </url>',
  ].join('\n')
}

/** Reindenta un bloque <url> preservando sus etiquetas internas y valores. */
function formatUrlBlock(block) {
  const inner = block
    .replace(/^\s*<url>\s*/, '')
    .replace(/\s*<\/url>\s*$/, '')
  const children = inner
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  return ['  <url>', ...children.map((child) => `    ${child}`), '  </url>'].join(
    '\n',
  )
}

function updateSitemap(slugs) {
  const existing = existsSync(SITEMAP_FILE)
    ? readFileSync(SITEMAP_FILE, 'utf8')
    : ''
  const blocks = [...existing.matchAll(/<url>[\s\S]*?<\/url>/g)].map((m) =>
    m[0].trim(),
  )

  const seen = new Set()
  const out = []

  for (const block of blocks) {
    const locMatch = block.match(/<loc>\s*([^<]+?)\s*<\/loc>/)
    const loc = locMatch ? locMatch[1] : ''
    if (!loc || seen.has(loc)) continue
    seen.add(loc)
    out.push(loc === BLOG_PATH ? renderBlogUrl(loc) : formatUrlBlock(block))
  }

  if (!seen.has(BLOG_PATH)) {
    seen.add(BLOG_PATH)
    out.push(renderBlogUrl(BLOG_PATH))
  }

  const added = []
  for (const slug of slugs) {
    const loc = `${BLOG_PATH}/${slug}`
    if (seen.has(loc)) continue
    seen.add(loc)
    out.push(renderBlogUrl(loc))
    added.push(loc)
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...out,
    '</urlset>',
    '',
  ].join('\n')

  writeFileSync(SITEMAP_FILE, xml, 'utf8')
  return added
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

function main() {
  const files = readPostFiles()
  if (files.length === 0) {
    throw new Error(`No se encontraron articulos .md en ${POSTS_DIR}`)
  }

  const errors = []
  const compiled = []

  for (const fileName of files) {
    const post = compilePost(fileName)
    errors.push(...post.errors)
    compiled.push(post)
  }

  const slugOwners = new Map()
  for (const post of compiled) {
    const slug = post.meta.slug
    if (!slug) continue
    if (slugOwners.has(slug)) {
      errors.push(
        `${post.fileName}: slug duplicado "${slug}" (ya definido en ${slugOwners.get(slug)})`,
      )
    } else {
      slugOwners.set(slug, post.fileName)
    }
  }

  if (errors.length > 0) {
    console.error('\n[generate-blog] Errores de validacion:\n')
    for (const error of errors) console.error(`  - ${error}`)
    console.error(`\n[generate-blog] ${errors.length} error(es). No se genero nada.\n`)
    process.exit(1)
  }

  const ordered = [...compiled].sort((a, b) =>
    a.meta.date === b.meta.date
      ? a.meta.slug.localeCompare(b.meta.slug)
      : b.meta.date.localeCompare(a.meta.date),
  )

  const postsIndex = ordered.map((post) => ({ ...post.meta }))
  const postsBySlug = {}
  for (const post of ordered) {
    postsBySlug[post.meta.slug] = { ...post.meta, html: post.html }
  }

  writeFileSync(OUTPUT_FILE, buildBlogModule(postsIndex, postsBySlug), 'utf8')

  const slugs = ordered.map((post) => post.meta.slug)
  const addedToSitemap = updateSitemap(slugs)

  const featured = postsIndex.find((post) => post.featured)
  console.log('[generate-blog] Blog compilado correctamente.')
  console.log(`  Articulos: ${postsIndex.length}`)
  console.log(`  Salida:    src/content/blogData.js`)
  console.log(`  Destacado: ${featured ? featured.slug : '(ninguno)'}`)
  if (addedToSitemap.length > 0) {
    console.log(`  Sitemap:   ${addedToSitemap.length} URL(s) de blog agregadas`)
  } else {
    console.log('  Sitemap:   URLs de blog ya presentes (sin cambios)')
  }
}

try {
  main()
} catch (error) {
  console.error(`\n[generate-blog] ${error.message}\n`)
  process.exit(1)
}
