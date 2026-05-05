import { useState, useEffect, useMemo, Fragment } from 'react'
import { parseHorasFromString } from '../../utils/bookingSlots'
import './AdminDashboard.css'

const ALL_HORAS_SORT = [
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
  '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM',
]

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

function sortHorasList(horas) {
  return [...horas].sort((a, b) => {
    const ia = ALL_HORAS_SORT.indexOf(a)
    const ib = ALL_HORAS_SORT.indexOf(b)
    if (ia >= 0 && ib >= 0) return ia - ib
    return String(a).localeCompare(String(b), 'es')
  })
}

/** Pistas legibles: prioriza el string `horas` (P3:12 PM|…); si no, campo `pistas` (número o lista). */
function dashboardPistasLabel(horasStr, pistasFallback) {
  const slots = parseHorasFromString(horasStr)
  if (slots.length > 0) {
    const nums = [...new Set(slots.map(s => s.pista))].sort((a, b) => a - b)
    return nums.map(n => `P${n}`).join(', ')
  }
  if (pistasFallback == null || String(pistasFallback).trim() === '') return '—'
  const raw = String(pistasFallback).trim()
  if (raw.includes(',') || raw.includes(';'))
    return raw.split(/[,;]/).map(s => String(s).trim()).filter(Boolean).map(x => (/^\d+$/.test(x) ? `P${x}` : x)).join(', ')
  return /^\d+$/.test(raw) ? `P${raw}` : raw
}

/** Texto compacto de horas cubiertos por la reserva (ordenados). */
function dashboardHorariosResumen(horasStr) {
  const slots = parseHorasFromString(horasStr)
  if (slots.length === 0) return null
  return sortHorasList([...new Set(slots.map(s => s.hora))]).join(' · ')
}

function parseHorasDisplayDetalle(horas) {
  if (!horas) return '—'
  const slots = parseHorasFromString(horas)
  if (slots.length === 0) return horas.replace(/\|/g, ' · ').replace(/P(\d+):/g, 'P$1: ')
  const byLane = new Map()
  slots.forEach(({ pista, hora }) => {
    if (!byLane.has(pista)) byLane.set(pista, new Set())
    byLane.get(pista).add(hora)
  })
  const parts = []
  for (const p of [...byLane.keys()].sort((a, b) => a - b)) {
    const hh = sortHorasList([...byLane.get(p)])
    parts.push(`P${p}: ${hh.join(', ')}`)
  }
  return parts.join(' | ')
}

function textoBusquedaReserva(r) {
  const parts = [
    r.reference,
    r.fecha,
    r.horas,
    r.datosPersonales?.nombre,
    r.datosPersonales?.documento,
    r.datosPersonales?.correo,
    dashboardPistasLabel(r.horas, r.pistas),
    dashboardHorariosResumen(r.horas),
  ].filter(Boolean)
  return parts.join(' ').toLowerCase()
}

function ReservaDetailPanel({ r }) {
  return (
    <div className="dash-detail-panel">
      <div className="dash-detail-grid">
        <div className="dash-detail-section">
          <h4><i className="fas fa-bowling-ball" /> Reserva</h4>
          <div className="dash-detail-row"><span>Referencia</span><strong>{r.reference}</strong></div>
          <div className="dash-detail-row"><span>Fecha</span><strong>{r.fecha}</strong></div>
          <div className="dash-detail-row"><span>Pistas</span><strong>{dashboardPistasLabel(r.horas, r.pistas)}</strong></div>
          <div className="dash-detail-row"><span>Horarios</span><strong>{parseHorasDisplayDetalle(r.horas)}</strong></div>
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
      list = list.filter(r => textoBusquedaReserva(r).includes(q))
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
            placeholder="Buscar por nombre, referencia, fecha, pista, horario..."
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
            <colgroup>
              {/* Ref   Fecha+hora  Responsable  Pistas  Total   Estado  Creada  Btn */}
              <col style={{ width: '26%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '9%'  }} />
              <col style={{ width: '9%'  }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '4%'  }} />
            </colgroup>
            <thead>
              <tr>
                <th>Referencia</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Pistas</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Creada</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const lineaHorarios = dashboardHorariosResumen(r.horas)
                const lineaPistas = dashboardPistasLabel(r.horas, r.pistas)
                const isManual = r.origen === 'manual' || String(r.reference || '').startsWith('MANUAL-')
                return (
                <Fragment key={r.reference}>
                  <tr className={expanded === r.reference ? 'expanded' : ''}>
                    <td className="dash-cell-ref">
                      <span className="dash-ref-text">{r.reference}</span>
                      {isManual && <span className="dash-ref-tag">Manual</span>}
                    </td>
                    <td className="dash-cell-fecha-slot">
                      <span className="dash-cell-date-main">{r.fecha || '—'}</span>
                      {lineaHorarios ? (
                        <span className="dash-cell-date-sub">
                          <i className="far fa-clock" /> {lineaHorarios}
                        </span>
                      ) : null}
                    </td>
                    <td className="dash-cell-name">{r.datosPersonales?.nombre || '—'}</td>
                    <td className="dash-cell-pistas-slot">{lineaPistas}</td>
                    <td className="dash-cell-total">{formatPrice(r.total || 0)}</td>
                    <td>
                      <span className={`dash-badge dash-badge-${ESTADO_CONFIG[r.estado]?.cls || 'pending'}`}>
                        <i className={ESTADO_CONFIG[r.estado]?.icon || 'fas fa-question'} />
                        {ESTADO_CONFIG[r.estado]?.label || r.estado}
                      </span>
                    </td>
                    <td className="dash-cell-date">{formatDate(r.creadaEn)}</td>
                    <td className="dash-cell-action">
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
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
