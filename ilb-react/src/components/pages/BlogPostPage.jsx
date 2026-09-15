import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { postsBySlug, postsIndex, isValidBlogSlug } from '../../content/blogData.js'
import './BlogPostPage.css'

const WHATSAPP_HREF = 'https://wa.me/573106418808'
const RELATED_LIMIT = 3

const DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/**
 * Formatea una fecha ISO (YYYY-MM-DD) en espanol, p. ej. "10 de marzo de 2026".
 * Se usa `timeZone: 'UTC'` para evitar el desfase de dia en husos negativos.
 * @param {string} isoDate
 * @returns {string}
 */
function formatDateEs(isoDate) {
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) return isoDate
  return DATE_FORMATTER.format(parsed)
}

/**
 * Selecciona articulos recomendados: primero los de la misma categoria y luego
 * el resto, siempre excluyendo el articulo actual y ordenando por fecha reciente.
 * @param {object} post
 * @returns {Array<object>}
 */
function selectRelatedPosts(post) {
  const byRecentFirst = (a, b) => new Date(b.date) - new Date(a.date)
  const others = postsIndex.filter((entry) => entry.slug !== post.slug)
  const sameCategory = others.filter((entry) => entry.category === post.category).sort(byRecentFirst)
  const differentCategory = others.filter((entry) => entry.category !== post.category).sort(byRecentFirst)
  return [...sameCategory, ...differentCategory].slice(0, RELATED_LIMIT)
}

/**
 * Vista de articulo individual del blog. Recibe el `slug` por la ruta
 * `/blog/:slug` y renderiza el HTML ya sanitizado en build-time.
 */
export default function BlogPostPage() {
  const { slug } = useParams()
  const post = isValidBlogSlug(slug) ? postsBySlug[slug] : null

  const relatedPosts = useMemo(
    () => (post ? selectRelatedPosts(post) : []),
    [post],
  )

  if (!post) {
    return (
      <section className="blog-post-page blog-post-page--missing">
        <div className="blog-post-page-bg" aria-hidden="true" />
        <div className="blog-post-container">
          <div className="blog-post-missing">
            <p className="blog-post-missing-code" aria-hidden="true">404</p>
            <h2 className="blog-post-missing-title">Artículo no encontrado</h2>
            <p className="blog-post-missing-message">
              El artículo que buscas no existe o fue movido. Puedes explorar las
              demás publicaciones y seguir aprendiendo sobre el mundo de los bolos.
            </p>
            <Link className="blog-post-btn blog-post-btn--primary" to="/blog">
              Volver al Blog
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="blog-post-page">
      <div className="blog-post-page-bg" aria-hidden="true" />
      <div className="blog-post-container">
        <nav className="blog-post-breadcrumbs" aria-label="Ruta de navegación">
          <ol>
            <li>
              <Link to="/">Inicio</Link>
            </li>
            <li>
              <Link to="/blog">Blog</Link>
            </li>
            <li aria-current="page">{post.category}</li>
          </ol>
        </nav>

        <article className="blog-post-article">
          <header className="blog-post-header">
            <span className="blog-post-badge">{post.category}</span>
            <h1 className="blog-post-title">{post.title}</h1>
            <p className="blog-post-description">{post.description}</p>
            <div className="blog-post-meta">
              <time dateTime={post.date}>{formatDateEs(post.date)}</time>
              <span className="blog-post-meta-sep" aria-hidden="true">•</span>
              <span>{post.readingTime} de lectura</span>
              <span className="blog-post-meta-sep" aria-hidden="true">•</span>
              <span>{post.author}</span>
            </div>
          </header>

          <figure className="blog-post-hero">
            <img src={post.image} alt={post.imageAlt || post.title} />
          </figure>

          <div
            className="blog-post-content"
            dangerouslySetInnerHTML={{ __html: post.html }}
          />
        </article>

        <aside className="blog-post-cta" aria-labelledby="blog-post-cta-title">
          <h2 id="blog-post-cta-title" className="blog-post-cta-title">
            ¿Listo para poner a prueba tu técnica en la pista?
          </h2>
          <p className="blog-post-cta-text">
            En La Industria Bolera te esperan las pistas, la cocina y el ambiente
            para convertir lo que aprendiste aquí en tu mejor partida. Reserva
            hoy y trae a tu grupo.
          </p>
          <div className="blog-post-cta-actions">
            <Link className="blog-post-btn blog-post-btn--primary" to="/reservas">
              Reservar Pista Ahora
            </Link>
            <a
              className="blog-post-btn blog-post-btn--ghost"
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
            >
              Consultar por WhatsApp
            </a>
          </div>
        </aside>

        {relatedPosts.length > 0 && (
          <section className="blog-post-related" aria-labelledby="blog-post-related-title">
            <h2 id="blog-post-related-title" className="blog-post-related-title">
              Artículos recomendados
            </h2>
            <div className="blog-post-related-grid">
              {relatedPosts.map((related) => (
                <article className="blog-post-related-card" key={related.slug}>
                  <Link
                    className="blog-post-related-thumb"
                    to={`/blog/${related.slug}`}
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    <img src={related.image} alt="" loading="lazy" />
                  </Link>
                  <div className="blog-post-related-body">
                    <span className="blog-post-related-category">{related.category}</span>
                    <h3 className="blog-post-related-card-title">
                      <Link to={`/blog/${related.slug}`}>{related.title}</Link>
                    </h3>
                    <time className="blog-post-related-date" dateTime={related.date}>
                      {formatDateEs(related.date)}
                    </time>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="blog-post-back">
          <Link to="/blog">← Volver a todos los artículos</Link>
        </div>
      </div>
    </section>
  )
}
