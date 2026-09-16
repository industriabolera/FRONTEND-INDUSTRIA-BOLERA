import { Link } from 'react-router-dom'
import { PUBLIC_NAV } from '../config/navigation'
import './Footer.css'

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

          {/* Navigation — deriva de la configuración compartida (sin lista propia) */}
          <div className="footer-col footer-col-nav">
            <nav aria-label="Navegación del pie de página">
              <ul className="footer-nav-menu">
                {PUBLIC_NAV.map((item) => {
                  const linkClass = `footer-nav-link${item.type === 'cta' ? ' footer-nav-link--cta' : ''}`

                  if (item.type === 'group' && item.children?.length) {
                    return (
                      <li key={item.label} className="footer-nav-item footer-nav-item--group">
                        <Link to={item.href} className={linkClass}>{item.label}</Link>
                        <ul className="footer-nav-submenu">
                          {item.children.map((child) => (
                            <li key={child.label} className="footer-nav-item">
                              <Link to={child.href} className="footer-nav-link footer-nav-link--child">
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                    )
                  }

                  return (
                    <li key={item.label} className="footer-nav-item">
                      <Link to={item.href} className={linkClass}>{item.label}</Link>
                    </li>
                  )
                })}
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
              Whatsapp: (57) 3106418808
              <br /><br />
              E-mail: info@laindustriabolera.co
            </p>
          </div>
        </div>
      </section>

      {/* Footer Bottom */}
      <section className="footer-bottom">
        <div className="footer-bottom-container">
          <div className="footer-bottom-left">
            <div className="footer-bottom-buttons">
              <Link
                to="/politica-de-privacidad"
                className="elementor-button elementor-size-sm elementor-animation-grow footer-policy-btn"
              >
                Políticas de privacidad
              </Link>
              <Link
                to="/terminos-y-condiciones"
                className="elementor-button elementor-size-sm elementor-animation-grow footer-policy-btn"
              >
                Términos y condiciones
              </Link>
              <Link
                to="/politica-de-cookies"
                className="elementor-button elementor-size-sm elementor-animation-grow footer-policy-btn"
              >
                Política de cookies
              </Link>
              <Link
                to="/contacto"
                className="elementor-button elementor-size-sm elementor-animation-grow footer-policy-btn"
              >
                Peticiones, Quejas y Reclamos (PQR)
              </Link>
            </div>
          </div>
          <div className="footer-bottom-right">
            <p className="footer-copyright">
              © 2026 La Industria Bolera. Todos los derechos reservados.
            </p>
          </div>
          <div className="footer-legal-notice">
            <p>
              Operado por: <strong>ENTRETENIMIENTO Y DIVERSIÓN S.A.S.</strong> · NIT: <strong>901.273.723-6</strong>
              <br />
              Para conocer sus derechos como consumidor o interponer una queja, visite la{' '}
              <a href="https://www.sic.gov.co" target="_blank" rel="noopener noreferrer" className="footer-sic-link">
                Superintendencia de Industria y Comercio (SIC)
              </a>.
            </p>
          </div>
        </div>
      </section>
    </footer>
  )
}
