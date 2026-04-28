import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { BoleraProvider } from './context/BoleraContext'
import Header from './components/Header'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import HomePage from './components/HomePage'
import ReservasPage from './components/ReservasPage'
import AdminPage from './components/admin/AdminPage'
import './App.css'

function RouteScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
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
          </Routes>
        </main>
      </div>
      <Footer />
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
