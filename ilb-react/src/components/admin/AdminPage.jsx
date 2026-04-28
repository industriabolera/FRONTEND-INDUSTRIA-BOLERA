import { useState } from 'react'
import { useBolera } from '../../context/BoleraContext'
import AdminPrecios from './AdminPrecios'
import AdminPromociones from './AdminPromociones'
import AdminPistas from './AdminPistas'
import AdminReservas from './AdminReservas'
import AdminDashboard from './AdminDashboard'
import './AdminPage.css'

const ADMIN_PASS = 'bolera2026'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-bar' },
  { id: 'precios', label: 'Precios', icon: 'fas fa-tags' },
  { id: 'promociones', label: 'Promociones', icon: 'fas fa-percent' },
  { id: 'pistas', label: 'Pistas', icon: 'fas fa-bowling-ball' },
  { id: 'reservas', label: 'Reservas', icon: 'fas fa-calendar-check' },
]

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('dashboard')
  const { config } = useBolera()

  const handleLogin = (e) => {
    e.preventDefault()
    if (password === ADMIN_PASS) {
      setAuthenticated(true)
      setError('')
    } else {
      setError('Contraseña incorrecta')
    }
  }

  if (!authenticated) {
    return (
      <section className="admin-page">
        <div className="admin-login-container">
          <div className="admin-login-card">
            <div className="admin-login-header">
              <img
                src="/images/LogoIndustriaBoleraColor_Footer-141x141.png"
                alt="La Industria Bolera"
                className="admin-login-logo"
              />
              <h1>Panel Administrador</h1>
              <p>Ingresa la contraseña para acceder</p>
            </div>
            <form onSubmit={handleLogin} className="admin-login-form">
              <div className="admin-input-group">
                <i className="fas fa-lock" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  autoFocus
                />
              </div>
              {error && <p className="admin-login-error"><i className="fas fa-exclamation-circle" /> {error}</p>}
              <button type="submit" className="admin-login-btn">Ingresar</button>
            </form>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="admin-page">
      <div className="admin-container">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <div className="admin-sidebar-header">
            <img
              src="/images/LogoIndustriaBoleraColor_Footer-141x141.png"
              alt="Logo"
              className="admin-sidebar-logo"
            />
            <span className="admin-sidebar-title">Admin Panel</span>
          </div>
          <nav className="admin-nav">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`admin-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <i className={tab.icon} />
                <span>{tab.label}</span>
                {tab.id === 'promociones' && config.promociones.length > 0 && (
                  <span className="admin-nav-badge">{config.promociones.length}</span>
                )}
                {tab.id === 'pistas' && config.bloqueos.length > 0 && (
                  <span className="admin-nav-badge">{config.bloqueos.length}</span>
                )}
                {tab.id === 'reservas' && config.reservasAdmin.length > 0 && (
                  <span className="admin-nav-badge">{config.reservasAdmin.length}</span>
                )}
              </button>
            ))}
          </nav>
          <button className="admin-logout-btn" onClick={() => setAuthenticated(false)}>
            <i className="fas fa-sign-out-alt" /> Cerrar sesión
          </button>
        </aside>

        {/* Main */}
        <main className="admin-main">
          <div className="admin-topbar">
            <h2 className="admin-page-title">
              <i className={TABS.find(t => t.id === activeTab)?.icon} />
              {TABS.find(t => t.id === activeTab)?.label}
            </h2>
          </div>
          <div className="admin-content">
            {activeTab === 'dashboard' && <AdminDashboard />}
            {activeTab === 'precios' && <AdminPrecios />}
            {activeTab === 'promociones' && <AdminPromociones />}
            {activeTab === 'pistas' && <AdminPistas />}
            {activeTab === 'reservas' && <AdminReservas />}
          </div>
        </main>
      </div>
    </section>
  )
}
