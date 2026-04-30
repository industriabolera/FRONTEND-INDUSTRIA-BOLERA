import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { BoleraProvider } from './context/BoleraContext'
import Header from './components/Header'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import FloatingWhatsApp from './components/FloatingWhatsApp'
import HomePage from './components/HomePage'
import ReservasPage from './components/ReservasPage'
import ServiciosPage from './components/pages/ServiciosPage'
import SobreNosotrosPage from './components/pages/SobreNosotrosPage'
import ContactoPage from './components/pages/ContactoPage'
import BlogPage from './components/pages/BlogPage'
import FaqPage from './components/pages/FaqPage'
import AdminPage from './components/admin/AdminPage'
import './App.css'

function RouteScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const id = hash.replace(/^#/, '')
      const el = document.getElementById(id)
      if (el) {
        const scroll = () => el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        requestAnimationFrame(() => requestAnimationFrame(scroll))
        return
      }
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

function PublicLayout() {
  return (
    <div className="site" id="page">
      <Header />
      <div id="content" className="site-content">
        <main id="main" className="site-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/reservas" element={<ReservasPage />} />
            <Route path="/servicios/*" element={<ServiciosPage />} />
            <Route path="/sobre-nosotros/*" element={<SobreNosotrosPage />} />
            <Route path="/contacto/*" element={<ContactoPage />} />
            <Route path="/blog/*" element={<BlogPage />} />
            <Route path="/faq/*" element={<FaqPage />} />
          </Routes>
        </main>
      </div>
      <Footer />
      <FloatingWhatsApp />
      <ScrollToTop />
    </div>
  )
}

export default function App() {
  return (
    <BoleraProvider>
      <BrowserRouter>
        <RouteScrollToTop />
        <Routes>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<PublicLayout />} />
        </Routes>
      </BrowserRouter>
    </BoleraProvider>
  )
}
