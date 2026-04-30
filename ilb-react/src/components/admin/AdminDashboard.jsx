import { useState, useEffect, useMemo, Fragment } from 'react'
import './AdminDashboard.css'

const ESTADO_CONFIG = {
  exitosa:   { label: 'Confirmada', icon: 'fas fa-check-circle', cls: 'success' },
  pendiente: { label: 'Pendiente',  icon: 'fas fa-clock',        cls: 'pending' },
  rechazada: { label: 'Rechazada',  icon: 'fas fa-times-circle', cls: 'rejected' },
  cancelada: { label: 'Cancelada',  icon: 'fas fa-ban',          cls: 'cancelled' },
}

function formatPrice(n) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function parseHorasDisplay(horas) {
  if (!horas) return '—'
  return horas.replace(/\|/g, ' · ').replace(/P(\d+):/g, 'P$1: ')
}

function ReservaDetailPanel({ r }) {
  return (
    <div className="dash-detail-panel">
      <div className="dash-detail-grid">
        <div className="dash-detail-section">
          <h4><i className="fas fa-bowling-ball" /> Reserva</h4>
          <div className="dash-detail-row"><span>Referencia</span><strong>{r.reference}</strong></div>
          <div className="dash-detail-row"><span>Fecha</span><strong>{r.fecha}</strong></div>
          <div className="dash-detail-row"><span>Pistas</span><strong>{r.pistas}</strong></div>
          <div className="dash-detail-row"><span>Horarios</span><strong>{parseHorasDisplay(r.horas)}</strong></div>
          <div className="dash-detail-row"><span>Personas</span><strong>{r.personas}</strong></div>
          {r.extras && <div className="dash-detail-row"><span>Extras</span><strong>{r.extras}</strong></div>}
          <div className="dash-detail-row"><span>Total</span><strong className="dash-detail-total">{formatPrice(r.total || 0)}</strong></div>
        </div>
        <div className="dash-detail-section">
          <h4><i className="fas fa-user" /> Datos del Cliente</h4>
          <div className="dash-detail-row"><span>Nombre</span><strong>{r.datosPersonales?.nombre}</strong></div>
          <div className="dash-detail-row"><span>Teléfono</span><strong>{r.datosPersonales?.telefono}</strong></div>
          <div className="dash-detail-row"><span>Correo</span><strong>{r.datosPersonales?.correo}</strong></div>
          <div className="dash-detail-row"><span>Documento</span><strong>{r.datosPersonales?.tipoDocumento} {r.datosPersonales?.documento}</strong></div>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [reservas, setReservas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtro, setFiltro] = useState('todas')
  const [busqueda, setBusqueda] = useState('')
  const [expanded, setExpanded] = useState(null)

  const fetchReservas = () => {
    fetch('/api/reservas')
      .then(r => r.json())
      .then(data => {
        if (data.reservas) setReservas(data.reservas)
        setError(null)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchReservas()
    const interval = setInterval(fetchReservas, 15000)
    return () => clearInterval(interval)
  }, [])

  const stats = useMemo(() => ({
    total: reservas.length,
    exitosa: reservas.filter(r => r.estado === 'exitosa').length,
    pendiente: reservas.filter(r => r.estado === 'pendiente').length,
    rechazada: reservas.filter(r => r.estado === 'rechazada').length,
    cancelada: reservas.filter(r => r.estado === 'cancelada').length,
    ingresos: reservas.filter(r => r.estado === 'exitosa').reduce((s, r) => s + (r.total || 0), 0),
  }), [reservas])

  const filtered = useMemo(() => {
    let list = reservas
    if (filtro !== 'todas') list = list.filter(r => r.estado === filtro)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      list = list.filter(r =>
        (r.reference || '').toLowerCase().includes(q) ||
        (r.datosPersonales?.nombre || '').toLowerCase().includes(q) ||
        (r.datosPersonales?.documento || '').includes(q) ||
        (r.datosPersonales?.correo || '').toLowerCase().includes(q) ||
        (r.fecha || '').includes(q)
      )
    }
    return list
  }, [reservas, filtro, busqueda])

  if (loading) {
    return (
      <div className="dash-loading">
        <i className="fas fa-spinner fa-spin" />
        <span>Cargando reservas...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dash-error">
        <i className="fas fa-exclamation-triangle" />
        <span>Error al cargar: {error}</span>
        <button onClick={fetchReservas}>Reintentar</button>
      </div>
    )
  }

  return (
    <div className="admin-dashboard">
      {/* Stats Cards */}
      <div className="dash-stats">
        <div className="dash-stat-card dash-stat-total">
          <div className="dash-stat-icon"><i className="fas fa-receipt" /></div>
          <div className="dash-stat-info">
            <span className="dash-stat-number">{stats.total}</span>
            <span className="dash-stat-label">Total Reservas</span>
          </div>
        </div>
        <div className="dash-stat-card dash-stat-success">
          <div className="dash-stat-icon"><i className="fas fa-check-circle" /></div>
          <div className="dash-stat-info">
            <span className="dash-stat-number">{stats.exitosa}</span>
            <span className="dash-stat-label">Confirmadas</span>
          </div>
        </div>
        <div className="dash-stat-card dash-stat-pending">
          <div className="dash-stat-icon"><i className="fas fa-clock" /></div>
          <div className="dash-stat-info">
            <span className="dash-stat-number">{stats.pendiente}</span>
            <span className="dash-stat-label">Pendientes</span>
          </div>
        </div>
        <div className="dash-stat-card dash-stat-revenue">
          <div className="dash-stat-icon"><i className="fas fa-dollar-sign" /></div>
          <div className="dash-stat-info">
            <span className="dash-stat-number">{formatPrice(stats.ingresos)}</span>
            <span className="dash-stat-label">Ingresos Confirmados</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="dash-toolbar">
        <div className="dash-search">
          <i className="fas fa-search" />
          <input
            type="text"
            placeholder="Buscar por nombre, referencia, documento..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <div className="dash-filters">
          {['todas', 'exitosa', 'pendiente', 'rechazada', 'cancelada'].map(f => (
            <button
              key={f}
              className={`dash-filter-btn ${filtro === f ? 'active' : ''}`}
              onClick={() => setFiltro(f)}
            >
              {f === 'todas' ? 'Todas' : ESTADO_CONFIG[f]?.label || f}
              {f !== 'todas' && <span className="dash-filter-count">{stats[f]}</span>}
            </button>
          ))}
        </div>
        <button className="dash-refresh-btn" onClick={fetchReservas} title="Actualizar">
          <i className="fas fa-sync-alt" />
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="dash-empty">
          <i className="fas fa-inbox" />
          <p>No hay reservas {filtro !== 'todas' ? `con estado "${ESTADO_CONFIG[filtro]?.label}"` : ''}</p>
        </div>
      ) : (
        <div className="dash-table-wrapper">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Referencia</th>
                <th>Fecha Reserva</th>
                <th>Responsable</th>
                <th>Pistas</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Creada</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <Fragment key={r.reference}>
                  <tr className={expanded === r.reference ? 'expanded' : ''}>
                    <td className="dash-cell-ref">{r.reference}</td>
                    <td>{r.fecha}</td>
                    <td className="dash-cell-name">{r.datosPersonales?.nombre || '—'}</td>
                    <td>{r.pistas || '—'}</td>
                    <td className="dash-cell-total">{formatPrice(r.total || 0)}</td>
                    <td>
                      <span className={`dash-badge dash-badge-${ESTADO_CONFIG[r.estado]?.cls || 'pending'}`}>
                        <i className={ESTADO_CONFIG[r.estado]?.icon || 'fas fa-question'} />
                        {ESTADO_CONFIG[r.estado]?.label || r.estado}
                      </span>
                    </td>
                    <td className="dash-cell-date">{formatDate(r.creadaEn)}</td>
                    <td>
                      <button
                        type="button"
                        className="dash-expand-btn"
                        onClick={() => setExpanded(expanded === r.reference ? null : r.reference)}
                      >
                        <i className={`fas fa-chevron-${expanded === r.reference ? 'up' : 'down'}`} />
                      </button>
                    </td>
                  </tr>
                  {expanded === r.reference && (
                    <tr className="dash-detail-expand" aria-live="polite">
                      <td colSpan={8}>
                        <ReservaDetailPanel r={r} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
