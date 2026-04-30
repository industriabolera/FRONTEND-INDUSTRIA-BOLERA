import { useEffect, useMemo, useRef, useState } from 'react'
import './HtmlLegacyPage.css'

function normalizeHref(rawHref) {
  if (!rawHref) return null
  const href = String(rawHref).trim()

  if (!href) return null

  // ignore some non-css / special rels
  if (href.startsWith('data:')) return null

  // keep absolute fonts
  if (href.startsWith('https://fonts.googleapis.com/')) return href
  if (href.startsWith('https://fonts.gstatic.com/')) return href

  // convert absolute same-domain to relative
  if (href.startsWith('https://laindustriabolera.co/')) return href.replace('https://laindustriabolera.co', '')
  if (href.startsWith('http://laindustriabolera.co/')) return href.replace('http://laindustriabolera.co', '')

  // protocol-relative: drop
  if (href.startsWith('//')) return null

  return href
}

async function isCssUrl(url) {
  try {
    // only check same-origin or absolute fonts
    const isAbsolute = /^https?:\/\//i.test(url)
    if (isAbsolute) {
      // only allow google fonts
      return url.startsWith('https://fonts.googleapis.com/')
    }

    // strip query for HEAD check consistency
    const headUrl = url

    const res = await fetch(headUrl, { method: 'HEAD', cache: 'no-cache' })
    if (!res.ok) return false

    const contentType = (res.headers.get('content-type') || '').toLowerCase()
    // Netlify/SPA mismatches tend to be text/html
    if (contentType.includes('text/html')) return false

    // accept typical css types
    return contentType.includes('text/css') || contentType.includes('text/plain')
  } catch {
    return false
  }
}

function ensureStylesheet(href, key) {
  const normalized = normalizeHref(href)
  if (!normalized) return null

  const id = `legacy-css:${key}:${normalized}`
  const existing = document.head.querySelector(`link[data-legacy-id="${CSS.escape(id)}"]`)
  if (existing) return existing

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = normalized
  link.setAttribute('data-legacy', 'true')
  link.setAttribute('data-legacy-id', id)
  document.head.appendChild(link)
  return link
}

function ensureInlineStyle(cssText, key, index) {
  const text = (cssText ?? '').trim()
  if (!text) return null

  const id = `legacy-style:${key}:${index}`
  const existing = document.head.querySelector(`style[data-legacy-id="${CSS.escape(id)}"]`)
  if (existing) return existing

  const style = document.createElement('style')
  style.type = 'text/css'
  style.textContent = text
  style.setAttribute('data-legacy', 'true')
  style.setAttribute('data-legacy-id', id)
  document.head.appendChild(style)
  return style
}

function extractMainHtml(doc) {
  const main =
    doc.querySelector('main#main') ||
    doc.querySelector('main.site-main') ||
    doc.querySelector('main')

  if (!main) return ''

  // remove scripts inside content (avoid Elementor runtime errors)
  main.querySelectorAll('script').forEach((s) => s.remove())

  return main.innerHTML || ''
}

export default function HtmlLegacyPage({ sourcePath }) {
  const [html, setHtml] = useState('')
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const cleanupRefs = useRef({
    prevBodyClass: null,
    injectedNodes: [],
  })

  const key = useMemo(() => sourcePath.replace(/\W+/g, '_'), [sourcePath])

  useEffect(() => {
    let cancelled = false

    async function cleanup() {
      cleanupRefs.current.injectedNodes.forEach((node) => {
        try {
          node.remove()
        } catch {
          // ignore
        }
      })
      cleanupRefs.current.injectedNodes = []

      if (cleanupRefs.current.prevBodyClass !== null) {
        document.body.setAttribute('class', cleanupRefs.current.prevBodyClass)
        cleanupRefs.current.prevBodyClass = null
      }
    }

    async function run() {
      setReady(false)
      setHtml('')
      setLoadError(null)

      await cleanup()

      try {
        const res = await fetch(sourcePath, { cache: 'no-cache' })
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const raw = await res.text()
        if (cancelled) return

        const parser = new DOMParser()
        const doc = parser.parseFromString(raw, 'text/html')

        // body classes (important for Astra/Elementor CSS selectors)
        const bodyClass = doc.body?.getAttribute('class') || ''
        cleanupRefs.current.prevBodyClass = document.body.getAttribute('class') || ''
        document.body.setAttribute('class', bodyClass)

        // inject inline style tags (safe)
        const styles = Array.from(doc.querySelectorAll('style'))
        styles.forEach((style, idx) => {
          const injected = ensureInlineStyle(style.textContent || '', key, idx)
          if (injected) cleanupRefs.current.injectedNodes.push(injected)
        })

        // inject stylesheets only if they exist and are css
        const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"][href]'))
        for (const link of links) {
          const href = link.getAttribute('href')
          const normalized = normalizeHref(href)
          if (!normalized) continue

          // skip Elementor Pro CSS (no lo tenemos local)
          if (normalized.startsWith('/wp-content/plugins/elementor-pro/')) continue

          // skip post-*.css if not available as css
          const ok = await isCssUrl(normalized)
          if (!ok) continue

          const injected = ensureStylesheet(normalized, key)
          if (injected) cleanupRefs.current.injectedNodes.push(injected)
        }

        const mainHtml = extractMainHtml(doc)
        if (!mainHtml.trim()) {
          throw new Error('El HTML legacy no incluye contenido principal (<main>).')
        }
        setHtml(mainHtml)
      } catch (e) {
        if (!cancelled) {
          setLoadError(e.message || 'Error al cargar la página.')
          setHtml('')
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    run()

    return () => {
      cancelled = true
      cleanup()
    }
  }, [key, sourcePath])

  if (!ready) {
    return (
      <div className="legacy-html-loading" role="status" aria-live="polite">
        <i className="fas fa-spinner fa-spin" />
        <span>Cargando contenido…</span>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="legacy-html-loading" role="alert">
        <i className="fas fa-exclamation-circle" />
        <span>No se pudo cargar el contenido ({sourcePath}). {loadError}</span>
      </div>
    )
  }

  return <div className="legacy-html-page" dangerouslySetInnerHTML={{ __html: html }} />
}
