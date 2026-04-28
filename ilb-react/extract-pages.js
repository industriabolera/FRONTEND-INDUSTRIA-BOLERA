import { readFileSync, writeFileSync } from 'fs'

const pages = [
  { html: 'Sevices.html', name: 'ServiciosPage', route: '/servicios' },
  { html: 'AboutUs.html', name: 'SobreNosotrosPage', route: '/sobre-nosotros' },
  { html: 'Blog.html', name: 'BlogPage', route: '/blog' },
  { html: 'FAQ.html', name: 'FaqPage', route: '/faq' },
]

// Image URL mapping: WordPress URLs → local /images/ paths
const imageReplacements = [
  [/https?:\/\/laindustriabolera\.co\/wp-content\/uploads\/\d+\/\d+\//g, '/images/'],
]

for (const page of pages) {
  const raw = readFileSync(page.html, 'utf-8')

  // Extract all <style> blocks (Elementor inline styles)
  const styleBlocks = []
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi
  let m
  while ((m = styleRegex.exec(raw)) !== null) {
    const content = m[1].trim()
    if (content && content.length > 50) { // skip tiny ones
      styleBlocks.push(content)
    }
  }

  // Extract article content
  const articleMatch = raw.match(/<article[^>]*>([\s\S]*?)<\/article>/)
  if (!articleMatch) {
    console.error(`No <article> found in ${page.html}`)
    continue
  }

  let articleContent = articleMatch[1]

  // Replace image URLs
  for (const [pattern, replacement] of imageReplacements) {
    articleContent = articleContent.replace(pattern, replacement)
  }

  // Also handle background-image in style attributes
  let styles = styleBlocks.join('\n\n')
  for (const [pattern, replacement] of imageReplacements) {
    styles = styles.replace(pattern, replacement)
  }

  // Fix: remove srcset and sizes attributes (they reference WordPress URLs)
  articleContent = articleContent.replace(/\s*srcset="[^"]*"/g, '')
  articleContent = articleContent.replace(/\s*sizes="[^"]*"/g, '')

  // Fix: remove loading="lazy" decoding="async" for cleaner markup
  // Keep them actually, they're fine

  // Generate React component
  const componentCode = `import { useEffect } from 'react'

const PAGE_STYLES = ${JSON.stringify(styles)};

const PAGE_CONTENT = ${JSON.stringify(articleContent)};

export default function ${page.name}() {
  useEffect(() => {
    // Inject Elementor styles
    const style = document.createElement('style')
    style.setAttribute('data-page', '${page.name}')
    style.textContent = PAGE_STYLES
    document.head.appendChild(style)
    return () => style.remove()
  }, [])

  return (
    <article
      className="wp-page-content"
      dangerouslySetInnerHTML={{ __html: PAGE_CONTENT }}
    />
  )
}
`

  const outPath = `src/components/${page.name}.jsx`
  writeFileSync(outPath, componentCode)
  console.log(`✅ ${outPath} (${(articleContent.length / 1024).toFixed(1)} KB content, ${(styles.length / 1024).toFixed(1)} KB styles)`)
}

console.log('\nDone!')
