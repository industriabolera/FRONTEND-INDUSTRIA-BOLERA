import { Link } from 'react-router-dom'
import './legal.css'

const LEGAL_LINKS = [
  { to: '/politica-de-privacidad', label: 'Política de Privacidad' },
  { to: '/terminos-y-condiciones', label: 'Términos y Condiciones' },
  { to: '/politica-de-cookies', label: 'Política de Cookies' },
]

export default function LegalPageLayout({ title, intro, activePath, children }) {
  return (
    <section className="legal-page">
      <div className="legal-page__bg" />
      <div className="legal-page__container">
        <nav className="legal-page__breadcrumbs" aria-label="Migas de pan">
          <Link to="/">Inicio</Link>
          <span aria-hidden="true">&gt;</span>
          <span aria-current="page">Políticas</span>
        </nav>

        <header className="legal-page__header">
          <h1 className="legal-page__title">{title}</h1>
          {intro && <p className="legal-page__intro">{intro}</p>}
          <p className="legal-page__updated">
            Última actualización: septiembre de 2026 · Versión 2026-v1
          </p>
        </header>

        <nav className="legal-page__nav" aria-label="Documentos legales">
          {LEGAL_LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`legal-page__nav-link${activePath === item.to ? ' is-active' : ''}`}
              aria-current={activePath === item.to ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <article className="legal-page__content">{children}</article>
      </div>
    </section>
  )
}
