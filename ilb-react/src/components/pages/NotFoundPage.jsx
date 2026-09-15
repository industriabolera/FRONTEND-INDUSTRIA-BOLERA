import { Link } from 'react-router-dom'
import './NotFoundPage.css'

const RESCUE_LINKS = [
  { to: '/', label: 'Ir al inicio', primary: true },
  { to: '/servicios', label: 'Ver servicios', primary: false },
  { to: '/reservas', label: 'Reservar una pista', primary: false },
  { to: '/contacto', label: 'Contactar', primary: false },
]

/**
 * Vista 404 del cliente. Se monta para cualquier URL que no coincida con una
 * ruta pública válida. El `SeoManager` la marca con `noindex, nofollow` y sin
 * canonical mediante `FALLBACK_SEO`.
 */
export default function NotFoundPage() {
  return (
    <section className="not-found" aria-labelledby="not-found-title">
      <div className="not-found-bg" aria-hidden="true" />
      <div className="not-found-container">
        <p className="not-found-code" aria-hidden="true">404</p>
        <h1 id="not-found-title" className="not-found-title">Página no encontrada</h1>
        <p className="not-found-message">
          Lo sentimos, la página que buscas no existe o fue movida. Puedes
          continuar tu visita desde cualquiera de estos enlaces.
        </p>

        <nav className="not-found-actions" aria-label="Enlaces de rescate">
          {RESCUE_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`not-found-link${link.primary ? ' not-found-link--primary' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  )
}
