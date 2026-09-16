import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { PUBLIC_NAV } from '../config/navigation'
import './Header.css'

// ── Estado activo (derivado del pathname, sin recursión) ─────
function pathnameOf(href) {
  return href.split('#')[0]
}

function isLinkActive(href, pathname) {
  const path = pathnameOf(href)
  if (path === '/') return pathname === '/'
  return pathname === path || pathname.startsWith(`${path}/`)
}

// Un grupo está activo si lo está su enlace o el de cualquiera de sus hijos.
// Esto permite que `/cumpleanos` marque visualmente "Servicios" sin que su
// enlace reciba `aria-current="page"` (eso lo resuelve NavLink por ruta real).
function isGroupActive(item, pathname) {
  if (isLinkActive(item.href, pathname)) return true
  return (item.children || []).some((child) => isLinkActive(child.href, pathname))
}

function navLinkClass(item, { groupActive = false } = {}) {
  return ({ isActive }) => {
    const classes = ['menu-link']
    if (isActive) classes.push('is-active')
    if (groupActive && !isActive) classes.push('is-section-active')
    if (item.type === 'cta') classes.push('menu-link-cta')
    return classes.join(' ')
  }
}

function submenuId(scope, item) {
  const slug = item.href
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return `${scope}-submenu-${slug}`
}

// ── Contención de foco del drawer (contrato modal) ───────────
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusable(container) {
  if (!container) return []
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (element) => element.getClientRects().length > 0
  )
}

export default function Header() {
  const { pathname } = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [desktopGroupOpen, setDesktopGroupOpen] = useState(null)
  const [mobileGroupOpen, setMobileGroupOpen] = useState(null)
  const [isSticky, setIsSticky] = useState(false)
  const [isShrunk, setIsShrunk] = useState(false)

  const toggleButtonRef = useRef(null)
  const drawerRef = useRef(null)
  const headerRef = useRef(null)
  const desktopToggleRefs = useRef({})

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      setIsSticky(scrollY > 0)
      setIsShrunk(scrollY > 100)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Fuente única de --header-height: la mantiene igual a la altura real del
  // header (expandir/encoger, viewport, orientación y carga de fuentes).
  useEffect(() => {
    const header = headerRef.current
    if (!header) return undefined
    const root = document.documentElement
    let rafId = 0
    const timers = []

    const applyHeight = () => {
      const height = Math.round(header.getBoundingClientRect().height)
      if (height > 0) root.style.setProperty('--header-height', `${height}px`)
    }

    // Reaplica durante unos frames para captar el valor asentado tras una
    // transición de tamaño (logo al cambiar viewport/scroll). No genera bucle:
    // --header-height no altera el header.
    const sweep = () => {
      let frames = 0
      cancelAnimationFrame(rafId)
      const step = () => {
        applyHeight()
        if (++frames < 30) rafId = requestAnimationFrame(step)
      }
      step()
    }

    // Confirma el valor definitivo aunque se pierda el frame final de la
    // transición del logo (cambio de viewport/orientación). Acotado.
    const settle = () => {
      timers.forEach((id) => window.clearTimeout(id))
      timers.length = 0
      ;[150, 450, 1000].forEach((ms) => timers.push(window.setTimeout(applyHeight, ms)))
    }

    const handleTransitionEnd = (event) => {
      if (event.propertyName === 'max-width') { sweep(); settle() }
    }
    const handleResize = () => { sweep(); settle() }

    sweep()
    settle()
    const observer = new ResizeObserver(sweep)
    observer.observe(header)
    window.addEventListener('resize', handleResize)
    header.addEventListener('transitionend', handleTransitionEnd)
    let cancelled = false
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => { if (!cancelled) { applyHeight(); settle() } }).catch(() => {})
    }
    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      timers.forEach((id) => window.clearTimeout(id))
      observer.disconnect()
      window.removeEventListener('resize', handleResize)
      header.removeEventListener('transitionend', handleTransitionEnd)
      root.style.removeProperty('--header-height')
    }
  }, [])

  // En desktop no puede sobrevivir el estado modal: cierra y libera scroll/backdrop.
  // En móvil no puede quedar el submenú desktop abierto (overlay residual).
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined
    const desktop = window.matchMedia('(min-width: 1152px)')
    const handleChange = (event) => {
      if (event.matches) setMobileMenuOpen(false)
      else setDesktopGroupOpen(null)
    }
    desktop.addEventListener('change', handleChange)
    return () => desktop.removeEventListener('change', handleChange)
  }, [])

  // Escape cierra el submenú desktop abierto y devuelve el foco a su disparador
  // (el botón permanece montado; Enter/Space siguen operando el botón nativo).
  useEffect(() => {
    if (!desktopGroupOpen) return undefined
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      const label = desktopGroupOpen
      setDesktopGroupOpen(null)
      desktopToggleRefs.current[label]?.focus()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [desktopGroupOpen])

  const closeMobileMenu = useCallback(({ restoreFocus = true } = {}) => {
    setMobileMenuOpen(false)
    if (restoreFocus) {
      // El disparador permanece montado, así que el foco puede volver ya.
      toggleButtonRef.current?.focus()
    }
  }, [])

  const handleToggleMobile = () => setMobileMenuOpen((prev) => !prev)

  const toggleDesktopGroup = (label) => {
    setDesktopGroupOpen((prev) => (prev === label ? null : label))
  }

  const toggleMobileGroup = (label) => {
    setMobileGroupOpen((prev) => (prev === label ? null : label))
  }

  // Contrato modal del drawer: scroll lock, foco inicial, trampa de tabulación,
  // Escape y contención ante foco programático externo. Se limpia por completo
  // al cerrar o desmontar (sin efectos residuales de scroll).
  useEffect(() => {
    if (!mobileMenuOpen) return undefined

    const drawer = drawerRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusables = getFocusable(drawer)
    ;(focusables[0] || drawer)?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeMobileMenu()
        return
      }
      if (event.key !== 'Tab') return

      const items = getFocusable(drawer)
      if (items.length === 0) {
        event.preventDefault()
        drawer?.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (event.shiftKey) {
        if (active === first || !drawer?.contains(active)) {
          event.preventDefault()
          last.focus()
        }
      } else if (active === last || !drawer?.contains(active)) {
        event.preventDefault()
        first.focus()
      }
    }

    const handleFocusIn = (event) => {
      if (drawer?.contains(event.target)) return
      // El disparador de cierre queda exento para no bloquear su clic.
      if (event.target === toggleButtonRef.current) return
      const items = getFocusable(drawer)
      ;(items[0] || drawer)?.focus()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', handleFocusIn)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', handleFocusIn)
    }
  }, [mobileMenuOpen, closeMobileMenu])

  return (
    <>
      <header
        ref={headerRef}
        className={`site-header ${isSticky ? 'ast-header-sticked' : ''} ${isShrunk ? 'ast-sticky-shrunk' : ''}`}
        id="masthead"
        data-drawer-open={mobileMenuOpen ? 'true' : 'false'}
      >
        <div className="ast-primary-header-bar">
          <div className="site-primary-header-wrap ast-container">
            <div className="ast-builder-grid-row">
              <div className="site-header-section-left">
                <div className="site-branding">
                  <Link to="/" className="custom-logo-link" rel="home" aria-label="La Industria Bolera — Inicio">
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
                    {PUBLIC_NAV.map((item) => {
                      if (item.type === 'group' && item.children?.length) {
                        const groupActive = isGroupActive(item, pathname)
                        const isOpen = desktopGroupOpen === item.label
                        const panelId = submenuId('desktop', item)
                        return (
                          <li
                            key={item.label}
                            className={`menu-item menu-item-has-children${groupActive ? ' is-section-active' : ''}`}
                          >
                            <NavLink
                              to={item.href}
                              className={navLinkClass(item, { groupActive })}
                              onClick={() => setDesktopGroupOpen(null)}
                            >
                              <span className="menu-text">{item.label}</span>
                            </NavLink>
                            <button
                              type="button"
                              ref={(node) => { desktopToggleRefs.current[item.label] = node }}
                              className="submenu-toggle"
                              aria-expanded={isOpen}
                              aria-controls={panelId}
                              aria-label={`${isOpen ? 'Ocultar' : 'Mostrar'} submenú de ${item.label}`}
                              onClick={() => toggleDesktopGroup(item.label)}
                            >
                              <span className="submenu-caret" aria-hidden="true">▾</span>
                            </button>
                            {isOpen && (
                              <ul id={panelId} className="main-header-submenu">
                                {item.children.map((child) => (
                                  <li key={child.label} className="menu-item">
                                    <NavLink
                                      to={child.href}
                                      className={navLinkClass(child)}
                                      onClick={() => setDesktopGroupOpen(null)}
                                    >
                                      <span className="menu-text">{child.label}</span>
                                    </NavLink>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        )
                      }
                      return (
                        <li key={item.label} className="menu-item">
                          <NavLink to={item.href} className={navLinkClass(item)}>
                            <span className="menu-text">{item.label}</span>
                          </NavLink>
                        </li>
                      )
                    })}
                  </ul>
                </nav>

                <div className="header-ticket">
                  <Link to="/reservas#reservar" className="header-ticket-link" title="¡Reserva ya!">
                    <img
                      src="/images/TicketHeader-300x191.png"
                      alt="¡Reserva ya! Ir al formulario de reservas"
                      width="243"
                      height="155"
                    />
                  </Link>
                </div>
              </div>

              {/* Mobile Toggle */}
              <div className="site-header-section-right mobile-toggle">
                <button
                  type="button"
                  ref={toggleButtonRef}
                  className="menu-toggle"
                  onClick={handleToggleMobile}
                  aria-expanded={mobileMenuOpen}
                  aria-controls="mobile-menu-drawer"
                  aria-label="Menú principal"
                >
                  {mobileMenuOpen ? (
                    <svg aria-hidden="true" focusable="false" className="ast-mobile-svg ast-close-svg" fill="currentColor" width="24" height="24" viewBox="0 0 24 24">
                      <path d="M5.293 6.707l5.293 5.293-5.293 5.293c-0.391 0.391-0.391 1.024 0 1.414s1.024 0.391 1.414 0l5.293-5.293 5.293 5.293c0.391 0.391 1.024 0.391 1.414 0s0.391-1.024 0-1.414l-5.293-5.293 5.293-5.293c0.391-0.391 0.391-1.024 0-1.414s-1.024-0.391-1.414 0l-5.293 5.293-5.293-5.293c-0.391-0.391-1.024-0.391-1.414 0s-0.391 1.024 0 1.414z" />
                    </svg>
                  ) : (
                    <svg aria-hidden="true" focusable="false" className="ast-mobile-svg ast-menu-svg" fill="currentColor" width="24" height="24" viewBox="0 0 24 24">
                      <path d="M3 13h18c0.552 0 1-0.448 1-1s-0.448-1-1-1h-18c-0.552 0-1 0.448-1 1s0.448 1 1 1zM3 7h18c0.552 0 1-0.448 1-1s-0.448-1-1-1h-18c-0.552 0-1 0.448-1 1s0.448 1 1 1zM3 19h18c0.552 0 1-0.448 1-1s-0.448-1-1-1h-18c-0.552 0-1 0.448-1 1s0.448 1 1 1z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/*
        Drawer y backdrop viven fuera de <header> para que WS-02 pueda situarlos
        por encima del banner de cookies (evita el contexto de apilado del header).
        IDs/contratos estables: #mobile-menu-drawer + .mobile-menu-backdrop.
      */}
      {mobileMenuOpen && (
        <>
          <div className="mobile-menu-backdrop" aria-hidden="true" onClick={() => closeMobileMenu()} />
          <div
            className="mobile-menu-content"
            id="mobile-menu-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            tabIndex={-1}
          >
            <nav aria-label="Navegación móvil">
              <ul className="mobile-header-menu">
                {PUBLIC_NAV.map((item) => {
                  if (item.type === 'group' && item.children?.length) {
                    const groupActive = isGroupActive(item, pathname)
                    const isOpen = mobileGroupOpen === item.label
                    const panelId = submenuId('mobile', item)
                    return (
                      <li
                        key={item.label}
                        className={`menu-item menu-item-has-children${groupActive ? ' is-section-active' : ''}`}
                      >
                        <div className="mobile-menu-row">
                          <NavLink
                            to={item.href}
                            className={navLinkClass(item, { groupActive })}
                            onClick={() => closeMobileMenu({ restoreFocus: false })}
                          >
                            <span className="menu-text">{item.label}</span>
                          </NavLink>
                          <button
                            type="button"
                            className="submenu-toggle"
                            aria-expanded={isOpen}
                            aria-controls={panelId}
                            aria-label={`${isOpen ? 'Ocultar' : 'Mostrar'} submenú de ${item.label}`}
                            onClick={() => toggleMobileGroup(item.label)}
                          >
                            <span className="submenu-caret" aria-hidden="true">▾</span>
                          </button>
                        </div>
                        {isOpen && (
                          <ul id={panelId} className="mobile-submenu">
                            {item.children.map((child) => (
                              <li key={child.label} className="menu-item">
                                <NavLink
                                  to={child.href}
                                  className={navLinkClass(child)}
                                  onClick={() => closeMobileMenu({ restoreFocus: false })}
                                >
                                  <span className="menu-text">{child.label}</span>
                                </NavLink>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    )
                  }
                  return (
                    <li key={item.label} className="menu-item">
                      <NavLink
                        to={item.href}
                        className={navLinkClass(item)}
                        onClick={() => closeMobileMenu({ restoreFocus: false })}
                      >
                        <span className="menu-text">{item.label}</span>
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </div>
        </>
      )}
    </>
  )
}
