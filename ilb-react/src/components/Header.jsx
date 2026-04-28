import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './Header.css'

// static = true → usa <a> normal (carga HTML estático de Netlify)
// static = false → usa React Router <Link>
const NAV_ITEMS = [
  { label: 'Home', href: '/', static: false },
  { label: 'Servicios', href: '/servicios', static: true },
  { label: 'Reservas', href: '/reservas', static: false },
  { label: 'Sobre Nosotros', href: '/sobre-nosotros', static: true },
  { label: 'Contacto', href: '/contacto', static: true },
  { label: 'Blog', href: '/blog', static: true },
  { label: 'FAQ', href: '/faq', static: true },
]

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isSticky, setIsSticky] = useState(false)
  const [isShrunk, setIsShrunk] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      setIsSticky(scrollY > 0)
      setIsShrunk(scrollY > 100)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleMobile = () => setMobileMenuOpen(prev => !prev)

  return (
    <>
      {/* Desktop Header */}
      <header
        className={`site-header ${isSticky ? 'ast-header-sticked' : ''} ${isShrunk ? 'ast-sticky-shrunk' : ''}`}
        id="masthead"
      >
        <div className="ast-primary-header-bar">
          <div className="site-primary-header-wrap ast-container">
            <div className="ast-builder-grid-row">
              <div className="site-header-section-left">
                <div className="site-branding">
                  <Link to="/" className="custom-logo-link" rel="home">
                    <img
                      width="141"
                      height="141"
                      src="/images/LogoIndustriaBoleraColor_Footer-141x141.png"
                      className="custom-logo"
                      alt="La Industria Bolera"
                    />
                  </Link>
                </div>
              </div>

              <div className="site-header-section-right desktop-nav">
                <nav className="main-navigation" aria-label="Navegación del sitio">
                  <ul className="main-header-menu">
                    {NAV_ITEMS.map((item) => (
                      <li key={item.label} className="menu-item">
                        {item.static ? (
                          <a href={item.href} className="menu-link">
                            <span className="menu-text">{item.label}</span>
                          </a>
                        ) : (
                          <Link to={item.href} className="menu-link">
                            <span className="menu-text">{item.label}</span>
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </nav>

                <div className="header-ticket">
                  <a href="https://wa.me/573113540008" target="_blank" rel="noopener noreferrer">
                    <img
                      src="/images/TicketHeader-300x191.png"
                      alt="Reserva tu ticket"
                      width="243"
                      height="155"
                    />
                  </a>
                </div>
              </div>

              {/* Mobile Toggle */}
              <div className="site-header-section-right mobile-toggle">
                <button
                  type="button"
                  className="menu-toggle"
                  onClick={toggleMobile}
                  aria-expanded={mobileMenuOpen}
                >
                  <span className="screen-reader-text">Main Menu</span>
                  {mobileMenuOpen ? (
                    <svg className="ast-mobile-svg ast-close-svg" fill="currentColor" width="24" height="24" viewBox="0 0 24 24">
                      <path d="M5.293 6.707l5.293 5.293-5.293 5.293c-0.391 0.391-0.391 1.024 0 1.414s1.024 0.391 1.414 0l5.293-5.293 5.293 5.293c0.391 0.391 1.024 0.391 1.414 0s0.391-1.024 0-1.414l-5.293-5.293 5.293-5.293c0.391-0.391 0.391-1.024 0-1.414s-1.024-0.391-1.414 0l-5.293 5.293-5.293-5.293c-0.391-0.391-1.024-0.391-1.414 0s-0.391 1.024 0 1.414z" />
                    </svg>
                  ) : (
                    <svg className="ast-mobile-svg ast-menu-svg" fill="currentColor" width="24" height="24" viewBox="0 0 24 24">
                      <path d="M3 13h18c0.552 0 1-0.448 1-1s-0.448-1-1-1h-18c-0.552 0-1 0.448-1 1s0.448 1 1 1zM3 7h18c0.552 0 1-0.448 1-1s-0.448-1-1-1h-18c-0.552 0-1 0.448-1 1s0.448 1 1 1zM3 19h18c0.552 0 1-0.448 1-1s-0.448-1-1-1h-18c-0.552 0-1 0.448-1 1s0.448 1 1 1z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="mobile-menu-content">
            <nav aria-label="Navegación del sitio">
              <ul className="mobile-header-menu">
                {NAV_ITEMS.map((item) => (
                  <li key={item.label} className="menu-item">
                    {item.static ? (
                      <a href={item.href} className="menu-link" onClick={() => setMobileMenuOpen(false)}>
                        <span className="menu-text">{item.label}</span>
                      </a>
                    ) : (
                      <Link to={item.href} className="menu-link" onClick={() => setMobileMenuOpen(false)}>
                        <span className="menu-text">{item.label}</span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        )}
      </header>
    </>
  )
}
