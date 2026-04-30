import { useState, useEffect, useMemo } from 'react'
import { useBolera } from '../../context/BoleraContext'
import AdminPrecios from './AdminPrecios'
import AdminPromociones from './AdminPromociones'
import AdminPistas from './AdminPistas'
import AdminReservas from './AdminReservas'
import AdminDashboard from './AdminDashboard'
import AdminUsuarios from './AdminUsuarios'
import './AdminPage.css'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-bar' },
  { id: 'precios', label: 'Precios', icon: 'fas fa-tags' },
  { id: 'promociones', label: 'Promociones', icon: 'fas fa-percent' },
  { id: 'pistas', label: 'Pistas', icon: 'fas fa-bowling-ball' },
  { id: 'reservas', label: 'Reservas', icon: 'fas fa-calendar-check' },
  { id: 'usuarios', label: 'Usuarios', icon: 'fas fa-users-cog' },
]

export default function AdminPage() {
  const { config, auth, setAuth } = useBolera()
  const [authenticated, setAuthenticated] = useState(Boolean(auth?.token))
  const [username, setUsername] = useState(auth?.user?.username || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    setAuthenticated(Boolean(auth?.token))
  }, [auth?.token])

  const permissions = auth?.user?.permissions || []
  const allowedTabs = useMemo(() => {
    const can = (perm) => permissions.includes(perm)
    // Admin full
    const tabs = []
    if (can('reservas:read') || can('config:read') || can('pistas:read')) tabs.push('dashboard')
    if (can('config:write')) tabs.push('precios', 'promociones')
    if (can('pistas:write') || can('pistas:read')) tabs.push('pistas')
    if (can('reservas:read') || can('reservas:write')) tabs.push('reservas')
    if (can('users:write')) tabs.push('usuarios')
    // unique
    return Array.from(new Set(tabs))
  }, [permissions])

  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0])
    }
  }, [allowedTabs, activeTab])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Error de autenticación')
      setAuth({ token: data.token, user: data.user })
      setAuthenticated(true)
      setPassword('')
    } catch (err) {
      setAuthenticated(false)
      setError(err.message || 'No se pudo iniciar sesión')
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
                <i className="fas fa-user" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Usuario"
                  autoComplete="username"
                  autoFocus
                />
              </div>
              <div className="admin-input-group">
                <i className="fas fa-lock" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="admin-password-toggle"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'} />
                </button>
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
            {TABS.filter(t => allowedTabs.includes(t.id)).map(tab => (
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
          <button className="admin-logout-btn" onClick={() => { setAuthenticated(false); setAuth({ token: '', user: null }) }}>
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
            {activeTab === 'precios' && allowedTabs.includes('precios') && <AdminPrecios />}
            {activeTab === 'promociones' && allowedTabs.includes('promociones') && <AdminPromociones />}
            {activeTab === 'pistas' && allowedTabs.includes('pistas') && <AdminPistas />}
            {activeTab === 'reservas' && allowedTabs.includes('reservas') && <AdminReservas />}
            {activeTab === 'usuarios' && allowedTabs.includes('usuarios') && <AdminUsuarios />}
          </div>
        </main>
      </div>
    </section>
  )
}
