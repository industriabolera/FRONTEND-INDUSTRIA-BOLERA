import { Link } from 'react-router-dom'
import './Footer.css'

const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Servicios', href: '/servicios' },
  { label: 'Reservas', href: '/reservas' },
  { label: 'Sobre Nosotros', href: '/sobre-nosotros' },
  { label: 'Contacto', href: '/contacto' },
  { label: 'Blog', href: '/blog' },
  { label: 'FAQ', href: '/faq' },
]

export default function Footer() {
  return (
    <footer className="site-footer-main">
      {/* Footer Top */}
      <section className="footer-top">
        <div className="footer-top-container">
          {/* Logo */}
          <div className="footer-col footer-col-logo">
            <img
              src="/images/LogoIndustriaBoleraColor_Footer-141x141.png"
              alt="La Industria Bolera"
              className="footer-logo"
              width="600"
              height="600"
            />
          </div>

          {/* Navigation */}
          <div className="footer-col footer-col-nav">
            <nav aria-label="Footer Navigation">
              <ul className="footer-nav-menu">
                {NAV_ITEMS.map((item) => (
                  <li key={item.label}>
                    <Link to={item.href} className="footer-nav-link">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Location */}
          <div className="footer-col footer-col-location">
            <p className="footer-col-title">¿Dónde estamos?</p>
            <div className="footer-col-divider" />
            <p className="footer-col-text">
              Carrera 70 # 1 – 141, Local 453
              <br /><br />
              Arkadia Centro Comercial
              <br /><br />
              Medellín, Antioquia
            </p>
          </div>

          {/* Contact */}
          <div className="footer-col footer-col-contact">
            <p className="footer-col-title">Contacto</p>
            <div className="footer-col-divider" />
            <p className="footer-col-text">
              Teléfono: (604) 6043059
              <br /><br />
              Whatsapp: (57) 3106418808
              <br /><br />
              E-mail: info@laindustriabolera.com
            </p>
          </div>
        </div>
      </section>

      {/* Footer Bottom */}
      <section className="footer-bottom">
        <div className="footer-bottom-container">
          <div className="footer-bottom-left">
            <div className="footer-bottom-buttons">
              <a
                className="elementor-button elementor-size-sm elementor-animation-grow footer-policy-btn"
                href="/docs/POLÍTICAS DE TRATAMIENTO DE DATOS.docx"
                target="_blank"
                rel="noopener noreferrer"
              >
                Políticas internas
              </a>
              <a
                className="elementor-button elementor-size-sm elementor-animation-grow footer-policy-btn"
                href="/docs/Terminos y Condiciones La Industria Bolera.docx"
                target="_blank"
                rel="noopener noreferrer"
              >
                Reglamento
              </a>
            </div>
          </div>
          <div className="footer-bottom-right">
            <p className="footer-copyright">
              <a href="https://conker.com.co/" target="_blank" rel="noopener noreferrer">
                © All rights reserved - La Industria Bolera / 2022 - Creado por Conker.com.co
              </a>
            </p>
          </div>
        </div>
      </section>
    </footer>
  )
}
