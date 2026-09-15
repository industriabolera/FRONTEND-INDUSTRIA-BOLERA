import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { postsIndex, getFeaturedPost, getCategories } from '../../content/blogData.js'
import './BlogPage.css'

const ALL_CATEGORIES = 'Todas'

/** Formatea una fecha ISO (YYYY-MM-DD) en formato legible en español. */
function formatDate(value) {
  if (!value) return ''
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORIES)

  const featured = useMemo(() => getFeaturedPost() || postsIndex[0] || null, [])
  const categories = useMemo(() => getCategories(), [])

  const matchingPosts = useMemo(
    () =>
      activeCategory === ALL_CATEGORIES
        ? postsIndex
        : postsIndex.filter((post) => post.category === activeCategory),
    [activeCategory],
  )

  const gridPosts = useMemo(
    () =>
      featured
        ? matchingPosts.filter((post) => post.slug !== featured.slug)
        : matchingPosts,
    [matchingPosts, featured],
  )

  const filters = [ALL_CATEGORIES, ...categories]

  return (
    <section className="blog-page">
      <div className="blog-page-bg" aria-hidden="true" />
      <div className="blog-page-container">
        <header className="blog-page-header">
          <p className="blog-page-eyebrow">Historias, guías y planes</p>
          <h1 className="blog-page-title">Blog de La Industria Bolera</h1>
          <p className="blog-page-lede">
            Consejos, eventos y experiencias en pista para que aproveches cada
            partida: desde tu primer strike hasta la celebración perfecta.
          </p>
        </header>

        {featured && (
          <article className="blog-featured">
            <Link
              className="blog-featured-media"
              to={`/blog/${featured.slug}`}
              tabIndex={-1}
              aria-hidden="true"
            >
              <img
                src={featured.image}
                alt=""
                width={768}
                height={512}
                loading="eager"
              />
              <span className="blog-featured-badge">Destacado</span>
            </Link>

            <div className="blog-featured-body">
              <div className="blog-featured-meta">
                <span className="blog-chip">{featured.category}</span>
                <span className="blog-reading">{featured.readingTime}</span>
                <time className="blog-featured-date" dateTime={featured.date}>
                  {formatDate(featured.date)}
                </time>
              </div>

              <h2 className="blog-featured-title">
                <Link to={`/blog/${featured.slug}`}>{featured.title}</Link>
              </h2>

              <p className="blog-featured-excerpt">{featured.description}</p>

              <div className="blog-featured-foot">
                <span className="blog-author">{featured.author}</span>
                <Link
                  className="blog-featured-cta"
                  to={`/blog/${featured.slug}`}
                >
                  Leer artículo completo →
                </Link>
              </div>
            </div>
          </article>
        )}

        <div
          className="blog-filter"
          role="group"
          aria-label="Filtrar artículos por categoría"
        >
          {filters.map((category) => {
            const isActive = category === activeCategory
            return (
              <button
                key={category}
                type="button"
                aria-pressed={isActive}
                className={`blog-filter-pill${isActive ? ' is-active' : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            )
          })}
        </div>

        {gridPosts.length > 0 && (
          <div className="blog-grid">
            {gridPosts.map((post) => (
              <article key={post.slug} className="blog-card">
                <Link
                  className="blog-card-media"
                  to={`/blog/${post.slug}`}
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  <img
                    src={post.image}
                    alt=""
                    width={768}
                    height={512}
                    loading="lazy"
                  />
                </Link>

                <div className="blog-card-body">
                  <div className="blog-card-meta">
                    <span className="blog-chip">{post.category}</span>
                    <span className="blog-reading">{post.readingTime}</span>
                  </div>

                  <h3 className="blog-card-title">
                    <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                  </h3>

                  <p className="blog-card-excerpt">{post.description}</p>

                  <div className="blog-card-foot">
                    <span className="blog-card-author">
                      {post.author}
                      <time
                        className="blog-card-date"
                        dateTime={post.date}
                      >
                        {formatDate(post.date)}
                      </time>
                    </span>
                    <Link className="blog-card-link" to={`/blog/${post.slug}`}>
                      Leer artículo →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {matchingPosts.length === 0 && (
          <p className="blog-empty">
            Todavía no hay artículos en esta categoría. Prueba con otra o vuelve
            pronto: publicamos consejos y planes nuevos cada mes.
          </p>
        )}
      </div>
    </section>
  )
}
