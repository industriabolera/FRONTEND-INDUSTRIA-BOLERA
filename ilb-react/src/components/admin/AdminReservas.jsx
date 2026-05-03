import { useState, useEffect, useMemo } from 'react'
import { useBolera } from '../../context/BoleraContext'

const ALL_HORAS = [
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
  '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM',
]

const PISTAS = Array.from({ length: 11 }, (_, i) => i + 1)

const EMPTY_FORM = {
  pista: 1,
  fecha: '',
  hora: '',
  personas: 2,
  metodoPago: '',
  nombre: '',
  telefono: '',
  notas: '',
}

const METODOS_PAGO = [
  { value: '', label: 'Seleccionar...' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'bono_regalo', label: 'Bono de regalo' },
  { value: 'otro', label: 'Otro' },
]

function metodoPagoLabel(value) {
  if (!value) return ''
  return METODOS_PAGO.find(m => m.value === value)?.label || value
}

const ESTADO_CONFIG = {
  exitosa:   { label: 'Confirmada', icon: 'fas fa-check-circle', cls: 'success' },
  pendiente: { label: 'Pendiente',  icon: 'fas fa-clock',        cls: 'pending' },
  rechazada: { label: 'Rechazada',  icon: 'fas fa-times-circle', cls: 'rejected' },
  cancelada: { label: 'Cancelada',  icon: 'fas fa-ban',          cls: 'cancelled' },
  manual:    { label: 'Manual',     icon: 'fas fa-user-shield',  cls: 'manual' },
}

function formatPrice(n) {
  if (n === null || n === undefined) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(n)
}

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function parseHorasFromString(horas) {
  if (!horas) return []
  const result = []
  horas.split('|').forEach(block => {
    const m = block.match(/^P(\d+):(.+)$/)
    if (m) {
      const pista = parseInt(m[1], 10)
      m[2].split(',').forEach(h => result.push({ pista, hora: h.trim() }))
    }
  })
  return result
}

function pistasResumen(slots) {
  const set = new Set(slots.map(s => s.pista))
  return Array.from(set).sort((a, b) => a - b).map(p => `P${p}`).join(', ')
}

function horasResumen(slots) {
  const set = new Set(slots.map(s => s.hora))
  return Array.from(set).join(' · ')
}

export default function AdminReservas() {
  const { config, addReservaAdmin, deleteReservaAdmin, isLaneBlocked, isLaneReservedAdmin, isLaneReservedOnline, auth } = useBolera()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [onlineReservas, setOnlineReservas] = useState([])
  const [loadingOnline, setLoadingOnline] = useState(true)
  const [errorOnline, setErrorOnline] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [filtro, setFiltro] = useState('todas')
  const [busqueda, setBusqueda] = useState('')

  const fetchOnline = () => {
    fetch('/api/reservas')
      .then(r => r.json())
      .then(data => {
        if (data.reservas) setOnlineReservas(data.reservas)
        setErrorOnline(null)
      })
      .catch(e => setErrorOnline(e.message))
      .finally(() => setLoadingOnline(false))
  }

  const authHeaders = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}

  const inactivarOnline = async (reference) => {
    const ok = window.confirm(`¿Inactivar la reserva ${reference}? Esto la marcará como cancelada.`)
    if (!ok) return
    const r = await fetch('/api/admin/reservas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ reference, action: 'inactivar', reason: 'Inactivada por admin' }),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(data.error || `Error ${r.status}`)
    fetchOnline()
  }

  const borrarOnline = async (reference) => {
    const ok = window.confirm(`¿Borrar definitivamente la reserva ${reference}? Esta acción no se puede deshacer.`)
    if (!ok) return
    const r = await fetch('/api/admin/reservas', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ reference }),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(data.error || `Error ${r.status}`)
    fetchOnline()
  }

  useEffect(() => {
    fetchOnline()
    const interval = setInterval(fetchOnline, 20000)
    return () => clearInterval(interval)
  }, [])

  const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.fecha || !form.hora || !form.nombre) return
    if (form.fecha && form.hora && isSlotTaken(form.pista, form.fecha, form.hora)) {
      window.alert('Esa pista ya no está disponible para la fecha/hora seleccionadas.')
      return
    }
    try {
      await addReservaAdmin(form)
      setForm(EMPTY_FORM)
      setShowForm(false)
      fetchOnline()
    } catch (err) {
      window.alert(err.message || String(err))
    }
  }

  const isSlotTaken = (pista, fecha, hora) => {
    if (!fecha || !hora) return false
    return isLaneBlocked(pista, fecha, hora) || isLaneReservedAdmin(pista, fecha, hora) || isLaneReservedOnline(pista, fecha, hora)
  }

  const availablePistas = useMemo(() => {
    if (!form.fecha || !form.hora) return PISTAS
    return PISTAS.filter(p => !isSlotTaken(p, form.fecha, form.hora))
  }, [form.fecha, form.hora, isLaneBlocked, isLaneReservedAdmin, isLaneReservedOnline])

  const availableHoras = useMemo(() => {
    // Si no hay fecha, permitir todas.
    if (!form.fecha) return ALL_HORAS

    // Si hay fecha pero no hora: mostrar horas que tengan al menos 1 pista libre.
    return ALL_HORAS.filter(h => {
      const anyAvailable = PISTAS.some(p => !isSlotTaken(p, form.fecha, h))
      return anyAvailable
    })
  }, [form.fecha, isLaneBlocked, isLaneReservedAdmin, isLaneReservedOnline])

  // Si el admin cambia fecha/hora y la pista ya no está disponible, mover a una disponible.
  useEffect(() => {
    if (!form.fecha || !form.hora) return
    if (availablePistas.includes(form.pista)) return
    const next = availablePistas[0]
    if (next) setForm(prev => ({ ...prev, pista: next }))
  }, [form.fecha, form.hora, form.pista, availablePistas])

  // ── Construir lista unificada (online + manual) ─────────────
  const unified = useMemo(() => {
    const onlineList = onlineReservas.map(r => {
      const slots = parseHorasFromString(r.horas)
      const isManual = r.origen === 'manual' || String(r.reference || '').startsWith('MANUAL-')
      return {
        key: isManual ? `manual-${r.reference}` : `online-${r.reference}`,
        origen: isManual ? 'manual' : 'online',
        numero: r.reference,
        fecha: r.fecha,
        slots,
        pistasResumen: pistasResumen(slots) || (r.pistas ? `P${r.pistas}` : '—'),
        horasResumen: horasResumen(slots) || '—',
        personas: r.personas,
        metodoPago: r.metodoPago || '',
        valor: r.total,
        estado: r.estado,
        cliente: r.datosPersonales?.nombre || '—',
        telefono: r.datosPersonales?.telefono || '',
        correo: r.datosPersonales?.correo || '',
        documento: r.datosPersonales ? `${r.datosPersonales.tipoDocumento || ''} ${r.datosPersonales.documento || ''}`.trim() : '',
        fechaNacimiento: r.datosPersonales?.fechaNacimiento || '',
        extras: r.extras || '',
        descripcion: r.description || '',
        notas: r.notas || '',
        creadaEn: r.creadaEn,
        actualizadaEn: r.actualizadaEn,
        raw: r,
      }
    })

    const manualList = config.reservasAdmin.map(r => ({
      key: `manual-${r.id}`,
      origen: 'manual',
      numero: r.id ? `MAN-${String(r.id).slice(0, 8).toUpperCase()}` : '—',
      fecha: r.fecha,
      slots: [{ pista: r.pista, hora: r.hora }],
      pistasResumen: `P${r.pista}`,
      horasResumen: r.hora,
      personas: r.personas,
      metodoPago: r.metodoPago || '',
      valor: null,
      estado: 'manual',
      cliente: r.nombre || '—',
      telefono: r.telefono || '',
      correo: '',
      documento: '',
      fechaNacimiento: '',
      extras: '',
      descripcion: '',
      notas: r.notas || '',
      creadaEn: r.creadaEn,
      actualizadaEn: '',
      raw: r,
    }))

    return [...onlineList, ...manualList]
  }, [onlineReservas, config.reservasAdmin])

  const filtered = useMemo(() => {
    let list = unified
    if (filtro !== 'todas') {
      if (filtro === 'manual') list = list.filter(r => r.origen === 'manual')
      else list = list.filter(r => r.estado === filtro)
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      list = list.filter(r =>
        (r.numero || '').toLowerCase().includes(q) ||
        (r.cliente || '').toLowerCase().includes(q) ||
        (r.telefono || '').includes(q) ||
        (r.correo || '').toLowerCase().includes(q) ||
        (r.documento || '').includes(q) ||
        (r.fecha || '').includes(q)
      )
    }
    return list
  }, [unified, filtro, busqueda])

  const grouped = useMemo(() => {
    return filtered.reduce((acc, r) => {
      const key = r.fecha || 'Sin fecha'
      if (!acc[key]) acc[key] = []
      acc[key].push(r)
      return acc
    }, {})
  }, [filtered])

  const sortedDates = Object.keys(grouped).sort().reverse()

  const counts = useMemo(() => ({
    todas: unified.length,
    exitosa: unified.filter(r => r.estado === 'exitosa').length,
    pendiente: unified.filter(r => r.estado === 'pendiente').length,
    rechazada: unified.filter(r => r.estado === 'rechazada').length,
    cancelada: unified.filter(r => r.estado === 'cancelada').length,
    manual: unified.filter(r => r.origen === 'manual').length,
  }), [unified])

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <p className="admin-panel-desc">
          Listado completo de reservas online y manuales. Haz clic en una tarjeta para ver toda la información del cliente y del pago.
        </p>
        <button className="admin-btn admin-btn-primary" onClick={() => setShowForm(!showForm)}>
          <i className={showForm ? 'fas fa-times' : 'fas fa-plus'} />
          {showForm ? 'Cancelar' : 'Nueva Reserva'}
        </button>
      </div>

      {showForm && (
        <form className="admin-card admin-form-card" onSubmit={handleSubmit}>
          <div className="admin-form-row admin-form-row-2">
            <div className="admin-field">
              <label className="admin-field-label">Nombre del cliente</label>
              <input className="admin-input" value={form.nombre} onChange={e => handleChange('nombre', e.target.value)} placeholder="Nombre completo" required />
            </div>
            <div className="admin-field">
              <label className="admin-field-label">Teléfono</label>
              <input className="admin-input" value={form.telefono} onChange={e => handleChange('telefono', e.target.value)} placeholder="3XX XXX XXXX" />
            </div>
          </div>

          <div className="admin-form-row admin-form-row-3">
            <div className="admin-field">
              <label className="admin-field-label">Pista</label>
              <select
                className="admin-input"
                value={form.pista}
                onChange={e => handleChange('pista', parseInt(e.target.value))}
                disabled={form.fecha && form.hora && availablePistas.length === 0}
              >
                {(form.fecha && form.hora ? availablePistas : PISTAS).map(p => (
                  <option key={p} value={p}>Pista {p}</option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-field-label">Fecha</label>
              <input className="admin-input" type="date" value={form.fecha} onChange={e => handleChange('fecha', e.target.value)} required />
            </div>
            <div className="admin-field">
              <label className="admin-field-label">Hora</label>
              <select className="admin-input" value={form.hora} onChange={e => handleChange('hora', e.target.value)} required>
                <option value="">Seleccionar...</option>
                {availableHoras.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          <div className="admin-form-row admin-form-row-2">
            <div className="admin-field">
              <label className="admin-field-label">Personas</label>
              <input
                className="admin-input"
                type="number"
                min="1"
                max="6"
                value={form.personas}
                onChange={e => handleChange('personas', Math.min(6, Math.max(1, parseInt(e.target.value) || 1)))}
              />
            </div>
            <div className="admin-field">
              <label className="admin-field-label">Método de pago (opcional)</label>
              <select className="admin-input" value={form.metodoPago} onChange={e => handleChange('metodoPago', e.target.value)}>
                {METODOS_PAGO.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="admin-field">
            <label className="admin-field-label">Notas / Comentarios (opcional)</label>
            <input className="admin-input" value={form.notas} onChange={e => handleChange('notas', e.target.value)} placeholder="Cumpleaños, evento especial..." />
          </div>

          <div className="admin-form-actions">
            <button type="submit" className="admin-btn admin-btn-primary">
              <i className="fas fa-calendar-plus" /> Crear Reserva
            </button>
          </div>
        </form>
      )}

      {/* ── Toolbar (search + filters) ──────────────────────── */}
      <div className="dash-toolbar">
        <div className="dash-search">
          <i className="fas fa-search" />
          <input
            type="text"
            placeholder="Buscar por número, nombre, teléfono, documento..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <div className="dash-filters">
          {['todas', 'exitosa', 'pendiente', 'rechazada', 'cancelada', 'manual'].map(f => (
            <button
              key={f}
              className={`dash-filter-btn ${filtro === f ? 'active' : ''}`}
              onClick={() => setFiltro(f)}
            >
              {f === 'todas' ? 'Todas' : ESTADO_CONFIG[f]?.label || f}
              <span className="dash-filter-count">{counts[f] || 0}</span>
            </button>
          ))}
        </div>
        <button className="dash-refresh-btn" onClick={fetchOnline} title="Actualizar">
          <i className="fas fa-sync-alt" />
        </button>
      </div>

      {errorOnline && (
        <div className="dash-error">
          <i className="fas fa-exclamation-triangle" />
          <span>Error cargando reservas online: {errorOnline}</span>
          <button onClick={fetchOnline}>Reintentar</button>
        </div>
      )}

      {loadingOnline && unified.length === 0 ? (
        <div className="dash-loading">
          <i className="fas fa-spinner fa-spin" />
          <span>Cargando reservas...</span>
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="admin-empty">
          <i className="fas fa-calendar" />
          <p>No hay reservas {filtro !== 'todas' ? `con estado "${ESTADO_CONFIG[filtro]?.label || filtro}"` : ''}</p>
        </div>
      ) : (
        <div className="admin-list">
          {sortedDates.map(fecha => (
            <div key={fecha} className="admin-date-group">
              <h4 className="admin-date-heading">
                <i className="far fa-calendar" /> {fecha}
                <span className="admin-date-count">{grouped[fecha].length} reserva(s)</span>
              </h4>
              {grouped[fecha].slice().sort((a, b) => (a.horasResumen || '').localeCompare(b.horasResumen || '')).map(r => {
                const isOpen = expanded === r.key
                const estadoCfg = (r.origen === 'manual'
                  ? ESTADO_CONFIG.manual
                  : (ESTADO_CONFIG[r.estado] || { label: r.estado, icon: 'fas fa-question', cls: 'pending' }))
                return (
                  <div key={r.key} className={`admin-card admin-reserva-full ${isOpen ? 'is-open' : ''}`}>
                    <button
                      className="admin-reserva-summary"
                      onClick={() => setExpanded(isOpen ? null : r.key)}
                      type="button"
                    >
                      <div className="admin-reserva-summary-main">
                        <div className="admin-reserva-summary-top">
                          <span className="admin-reserva-numero">
                            <i className="fas fa-hashtag" /> {r.numero}
                          </span>
                          <span className={`dash-badge dash-badge-${estadoCfg.cls}`}>
                            <i className={estadoCfg.icon} />
                            {estadoCfg.label}
                          </span>
                          {r.origen === 'manual' && (
                            <span className="admin-badge badge-gray">Manual</span>
                          )}
                        </div>
                        <div className="admin-reserva-summary-fields">
                          <span><i className="fas fa-bowling-ball" /> <strong>Pista:</strong> {r.pistasResumen}</span>
                          <span><i className="far fa-clock" /> <strong>Hora:</strong> {r.horasResumen}</span>
                          <span><i className="fas fa-users" /> <strong>Personas:</strong> {r.personas ?? '—'}</span>
                          {r.metodoPago ? (
                            <span><i className="fas fa-credit-card" /> <strong>Pago:</strong> {metodoPagoLabel(r.metodoPago)}</span>
                          ) : null}
                          <span className="admin-reserva-valor">
                            <i className="fas fa-dollar-sign" /> <strong>Valor:</strong> {formatPrice(r.valor)}
                          </span>
                          <span><i className="fas fa-user" /> <strong>Cliente:</strong> {r.cliente}</span>
                        </div>
                      </div>
                      <div className="admin-reserva-summary-actions">
                        <span className="admin-reserva-toggle">
                          <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`} />
                        </span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="admin-reserva-detail">
                        <div className="dash-detail-grid">
                          <div className="dash-detail-section">
                            <h4><i className="fas fa-bowling-ball" /> Detalle de la reserva</h4>
                            <div className="dash-detail-row"><span>Número</span><strong>{r.numero}</strong></div>
                            <div className="dash-detail-row"><span>Fecha</span><strong>{r.fecha}</strong></div>
                            <div className="dash-detail-row"><span>Pistas</span><strong>{r.pistasResumen}</strong></div>
                            <div className="dash-detail-row"><span>Horarios</span><strong>{r.horasResumen}</strong></div>
                            <div className="dash-detail-row"><span>Personas</span><strong>{r.personas ?? '—'}</strong></div>
                            {r.metodoPago && <div className="dash-detail-row"><span>Método de pago</span><strong>{metodoPagoLabel(r.metodoPago)}</strong></div>}
                            {r.extras && <div className="dash-detail-row"><span>Extras</span><strong>{r.extras}</strong></div>}
                            {r.descripcion && <div className="dash-detail-row"><span>Descripción</span><strong>{r.descripcion}</strong></div>}
                            {r.notas && <div className="dash-detail-row"><span>Notas</span><strong>{r.notas}</strong></div>}
                            <div className="dash-detail-row">
                              <span>Valor total</span>
                              <strong className="dash-detail-total">{formatPrice(r.valor)}</strong>
                            </div>
                            <div className="dash-detail-row">
                              <span>Estado</span>
                              <strong>
                                <span className={`dash-badge dash-badge-${estadoCfg.cls}`}>
                                  <i className={estadoCfg.icon} /> {estadoCfg.label}
                                </span>
                              </strong>
                            </div>
                            <div className="dash-detail-row"><span>Origen</span><strong>{r.origen === 'online' ? 'Online (PlaceToPay)' : 'Manual (Admin)'}</strong></div>
                            {r.creadaEn && <div className="dash-detail-row"><span>Creada</span><strong>{formatDateTime(r.creadaEn)}</strong></div>}
                            {r.actualizadaEn && <div className="dash-detail-row"><span>Actualizada</span><strong>{formatDateTime(r.actualizadaEn)}</strong></div>}
                          </div>

                          <div className="dash-detail-section">
                            <h4><i className="fas fa-user" /> Datos del cliente</h4>
                            <div className="dash-detail-row"><span>Nombre</span><strong>{r.cliente}</strong></div>
                            {r.telefono && <div className="dash-detail-row"><span>Teléfono</span><strong>{r.telefono}</strong></div>}
                            {r.correo && <div className="dash-detail-row"><span>Correo</span><strong>{r.correo}</strong></div>}
                            {r.documento && <div className="dash-detail-row"><span>Documento</span><strong>{r.documento}</strong></div>}
                            {r.fechaNacimiento && <div className="dash-detail-row"><span>Fecha de nacimiento</span><strong>{r.fechaNacimiento}</strong></div>}
                            {!r.telefono && !r.correo && !r.documento && r.origen === 'manual' && (
                              <p className="admin-reserva-empty-hint">Sin datos adicionales del cliente.</p>
                            )}
                          </div>
                        </div>

                        {r.origen === 'online' && (
                          <div className="admin-reserva-detail-actions">
                            {r.estado !== 'cancelada' && (
                              <button
                                className="admin-btn-icon admin-btn-danger"
                                title="Inactivar (marcar como cancelada)"
                                onClick={() => inactivarOnline(r.numero).catch(err => window.alert(err.message || err))}
                              >
                                <i className="fas fa-ban" /> Inactivar
                              </button>
                            )}
                            <button
                              className="admin-btn-icon admin-btn-danger"
                              title="Borrar reserva online"
                              onClick={() => borrarOnline(r.numero).then(() => fetchOnline()).catch(err => window.alert(err.message || err))}
                            >
                              <i className="fas fa-trash" /> Borrar
                            </button>
                          </div>
                        )}

                        {r.origen === 'manual' && r.raw?.reference && (
                          <div className="admin-reserva-detail-actions">
                            {r.estado !== 'cancelada' && (
                              <button
                                className="admin-btn-icon admin-btn-danger"
                                title="Inactivar (marcar como cancelada)"
                                onClick={() => inactivarOnline(r.numero).then(() => fetchOnline()).catch(err => window.alert(err.message || err))}
                              >
                                <i className="fas fa-ban" /> Inactivar
                              </button>
                            )}
                            <button
                              className="admin-btn-icon admin-btn-danger"
                              title="Eliminar reserva manual de la base de datos"
                              onClick={() => borrarOnline(r.numero).then(() => fetchOnline()).catch(err => window.alert(err.message || err))}
                            >
                              <i className="fas fa-trash" /> Eliminar
                            </button>
                          </div>
                        )}

                        {r.origen === 'manual' && !r.raw?.reference && r.raw?.id && (
                          <div className="admin-reserva-detail-actions">
                            <button
                              className="admin-btn-icon admin-btn-danger"
                              title="Eliminar reserva manual (solo local, legado)"
                              onClick={() => { deleteReservaAdmin(r.raw.id); fetchOnline() }}
                            >
                              <i className="fas fa-trash" /> Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
