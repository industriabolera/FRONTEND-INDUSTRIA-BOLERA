import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { BoleraProvider } from './context/BoleraContext'
import Header from './components/Header'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import SeoManager from './components/seo/SeoManager'
import FloatingWhatsApp from './components/FloatingWhatsApp'
import CookieConsentBanner from './components/CookieConsentBanner'
import HomePage from './components/HomePage'
import ReservasPage from './components/ReservasPage'
import ServiciosPage from './components/pages/ServiciosPage'
import SobreNosotrosPage from './components/pages/SobreNosotrosPage'
import ContactoPage from './components/pages/ContactoPage'
import BlogPage from './components/pages/BlogPage'
import BlogPostPage from './components/pages/BlogPostPage.jsx'
import FaqPage from './components/pages/FaqPage'
import CumpleanosPage from './components/pages/CumpleanosPage'
import NotFoundPage from './components/pages/NotFoundPage'
import PoliticaPrivacidadPage from './components/pages/legal/PoliticaPrivacidadPage'
import TerminosCondicionesPage from './components/pages/legal/TerminosCondicionesPage'
import PoliticaCookiesPage from './components/pages/legal/PoliticaCookiesPage'
import AdminPage from './components/admin/AdminPage'
import './App.css'

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Foco programático sin segundo scroll: `preventScroll` evita que el navegador
 * vuelva a desplazar la página tras el scroll explícito. Si el destino no es
 * focusable se le asigna `tabindex="-1"` (fuera del orden de tabulación).
 */
function focusWithoutScroll(element) {
  if (!element) return
  if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1')
  element.focus({ preventScroll: true })
}

function RouteScrollToTop() {
  // `key` distingue navegaciones al mismo pathname/hash (p. ej. volver a pulsar
  // "Reservar" estando ya en `/reservas#reservar`), sin tocar back/forward.
  const { pathname, hash, key } = useLocation()
  useEffect(() => {
    const reducedMotion = prefersReducedMotion()

    if (hash) {
      const id = hash.replace(/^#/, '')
      const behavior = reducedMotion ? 'auto' : 'smooth'
      let attempts = 0
      let timer = null
      let cancelled = false

      // El ancla puede no existir todavía en carga directa/recarga (el contenido
      // monta después). Reintento acotado (~3 s) que siempre termina, sin bucle.
      const seek = () => {
        if (cancelled) return
        const el = document.getElementById(id)
        if (el) {
          el.scrollIntoView({ behavior, block: 'start' })
          // En hash el foco termina en el destino real, nunca en el main.
          focusWithoutScroll(el)
          return
        }
        attempts += 1
        if (attempts <= 60) {
          timer = window.setTimeout(seek, 50)
          return
        }
        // Fallback acotado si el ancla no aparece nunca.
        window.scrollTo(0, 0)
        focusWithoutScroll(document.getElementById('main'))
      }

      requestAnimationFrame(() => requestAnimationFrame(seek))
      return () => {
        cancelled = true
        if (timer) window.clearTimeout(timer)
      }
    }

    // Sin hash: arriba + foco al contenido principal, sin segundo scroll.
    window.scrollTo(0, 0)
    focusWithoutScroll(document.getElementById('main'))
  }, [pathname, hash, key])
  return null
}

function PublicLayout() {
  return (
    <div className="site" id="page">
      <Header />
      <div id="content" className="site-content">
        <main id="main" className="site-main" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/reservas" element={<ReservasPage />} />
            <Route path="/servicios" element={<ServiciosPage />} />
            <Route path="/sobre-nosotros" element={<SobreNosotrosPage />} />
            <Route path="/contacto" element={<ContactoPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/cumpleanos" element={<CumpleanosPage />} />
            <Route path="/politica-de-privacidad" element={<PoliticaPrivacidadPage />} />
            <Route path="/politica-tratamiento-datos" element={<PoliticaPrivacidadPage />} />
            <Route path="/terminos-y-condiciones" element={<TerminosCondicionesPage />} />
            <Route path="/reglamento" element={<TerminosCondicionesPage />} />
            <Route path="/politica-de-cookies" element={<PoliticaCookiesPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
      <Footer />
      <FloatingWhatsApp />
      <CookieConsentBanner />
      <ScrollToTop />
    </div>
  )
}

export default function App() {
  return (
    <BoleraProvider>
      <BrowserRouter>
        <RouteScrollToTop />
        <SeoManager />
        <Routes>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<PublicLayout />} />
        </Routes>
      </BrowserRouter>
    </BoleraProvider>
  )
}

