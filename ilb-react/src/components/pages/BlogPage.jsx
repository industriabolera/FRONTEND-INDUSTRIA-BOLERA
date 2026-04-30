import { BLOG_ORIGIN, BLOG_POSTS } from './content/blogPosts'
import './PageShell.css'
import './StaticSitePages.css'

export default function BlogPage() {
  return (
    <section className="page-shell">
      <div className="page-shell-bg" />
      <div className="page-shell-container">
        <header className="page-shell-header">
          <h1 className="page-shell-title">NUESTRO BLOG</h1>
        </header>
        <div className="page-shell-body">
          <div className="static-blog-grid">
            {BLOG_POSTS.map((post) => {
              const href = `${BLOG_ORIGIN}${post.slug}`
              return (
                <article key={post.slug} className="static-blog-card">
                  <a className="static-blog-thumb" href={href} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden>
                    <img src={post.image} alt="" width={768} height={512} />
                  </a>
                  <div className="static-blog-card-body">
                    <div className="static-blog-meta">
                      <span>{post.date}</span>
                      <span> · </span>
                      <span>No hay comentarios</span>
                    </div>
                    <h2>
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        {post.title}
                      </a>
                    </h2>
                    <a className="static-blog-more" href={href} target="_blank" rel="noopener noreferrer">
                      Leer más »
                    </a>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
