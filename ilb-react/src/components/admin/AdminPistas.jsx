import { useState, useMemo } from 'react'
import { useBolera } from '../../context/BoleraContext'
import FloorPlan from '../FloorPlan'

const ALL_HORAS = [
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
  '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM',
]

function formatRange(b) {
  if (b.fechaInicio && b.fechaFin) {
    return b.fechaInicio === b.fechaFin
      ? b.fechaInicio
      : `${b.fechaInicio} → ${b.fechaFin}`
  }
  return b.fecha || '—'
}

function bloqueoSortKey(b) {
  return b.fechaInicio || b.fecha || ''
}

function bloqueoPasaFiltros(b, { filtroFecha, filtroHora, filtroPista }) {
  if (filtroPista && String(b.pista) !== String(filtroPista)) return false
  if (filtroFecha) {
    const fi = b.fechaInicio || b.fecha
    const ff = b.fechaFin || b.fecha || fi
    if (!fi || filtroFecha < fi || filtroFecha > ff) return false
  }
  if (filtroHora) {
    const horas = Array.isArray(b.horas) ? b.horas : []
    if (horas.length > 0 && !horas.includes(filtroHora)) return false
  }
  return true
}

const PISTA_OPTIONS = Array.from({ length: 11 }, (_, i) => i + 1)

export default function AdminPistas() {
  const { config, addBloqueo, deleteBloqueo } = useBolera()
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [filtroFecha, setFiltroFecha] = useState('')
  const [filtroHora, setFiltroHora] = useState('')
  const [filtroPista, setFiltroPista] = useState('')
  const [previewDate, setPreviewDate] = useState('')
  const [form, setForm] = useState({
    pistas: [],
    fechaInicio: '',
    fechaFin: '',
    horas: [],
    motivo: '',
    todoElDia: true,
  })

  const handleChange = (key, value) => {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'fechaInicio' && (!prev.fechaFin || value > prev.fechaFin)) {
        next.fechaFin = value
      }
      return next
    })
  }

  const togglePista = (pistaNum) => {
    setForm(prev => ({
      ...prev,
      pistas: prev.pistas.includes(pistaNum)
        ? prev.pistas.filter(p => p !== pistaNum)
        : [...prev.pistas, pistaNum].sort((a, b) => a - b)
    }))
  }

  const toggleHora = (hora) => {
    setForm(prev => ({
      ...prev,
      horas: prev.horas.includes(hora)
        ? prev.horas.filter(h => h !== hora)
        : [...prev.horas, hora]
    }))
  }

  const mapDate = previewDate || form.fechaInicio

  const blockedForMapDate = useMemo(() => {
    if (!mapDate) return []
    return Array.from({ length: 11 }, (_, i) => i + 1).filter(p =>
      config.bloqueos.some(b => {
        if (b.pista !== p) return false
        if (b.fechaInicio && b.fechaFin) {
          if (mapDate < b.fechaInicio || mapDate > b.fechaFin) return false
        } else if (b.fecha) {
          if (b.fecha !== mapDate) return false
        }
        return b.horas.length === 0
      })
    )
  }, [mapDate, config.bloqueos])

  const dayCount = useMemo(() => {
    if (!form.fechaInicio || !form.fechaFin) return 0
    const start = new Date(form.fechaInicio + 'T00:00:00')
    const end = new Date(form.fechaFin + 'T00:00:00')
    return Math.max(1, Math.round((end - start) / 86400000) + 1)
  }, [form.fechaInicio, form.fechaFin])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.fechaInicio || !form.fechaFin || form.pistas.length === 0) return
    setSaving(true)
    try {
      for (const pista of form.pistas) {
        await addBloqueo({
          pista,
          fechaInicio: form.fechaInicio,
          fechaFin: form.fechaFin,
          horas: form.todoElDia ? [] : form.horas,
          motivo: form.motivo,
        })
      }
      setForm({ pistas: [], fechaInicio: '', fechaFin: '', horas: [], motivo: '', todoElDia: true })
      setPreviewDate('')
      setShowForm(false)
    } catch (err) {
      window.alert(`No se pudo guardar el bloqueo: ${err.message || err}`)
    } finally {
      setSaving(false)
    }
  }

  const sortedBloqueos = useMemo(() =>
    [...config.bloqueos].sort((a, b) => bloqueoSortKey(a).localeCompare(bloqueoSortKey(b))),
    [config.bloqueos]
  )

  const filtros = useMemo(() => ({
    filtroFecha,
    filtroHora,
    filtroPista,
  }), [filtroFecha, filtroHora, filtroPista])

  const bloqueosFiltrados = useMemo(
    () => sortedBloqueos.filter(b => bloqueoPasaFiltros(b, filtros)),
    [sortedBloqueos, filtros]
  )

  const limpiarFiltros = () => {
    setFiltroFecha('')
    setFiltroHora('')
    setFiltroPista('')
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <p className="admin-panel-desc">
          Bloquea pistas por rango de fechas y horario. Las pistas bloqueadas no aparecerán disponibles en la página de reservas.
        </p>
        <button className="admin-btn admin-btn-primary" onClick={() => setShowForm(!showForm)}>
          <i className={showForm ? 'fas fa-times' : 'fas fa-ban'} />
          {showForm ? 'Cancelar' : 'Bloquear Pista'}
        </button>
      </div>

      {showForm && (
        <form className="admin-card admin-form-card" onSubmit={handleSubmit}>
          <div className="admin-form-row admin-form-row-2">
            <div className="admin-field">
              <label className="admin-field-label">Fecha Inicio</label>
              <input
                className="admin-input"
                type="date"
                value={form.fechaInicio}
                onChange={e => handleChange('fechaInicio', e.target.value)}
                required
              />
            </div>
            <div className="admin-field">
              <label className="admin-field-label">Fecha Fin</label>
              <input
                className="admin-input"
                type="date"
                value={form.fechaFin}
                min={form.fechaInicio}
                onChange={e => handleChange('fechaFin', e.target.value)}
                required
              />
            </div>
          </div>

          {dayCount > 0 && (
            <div className="admin-date-range-info">
              <i className="far fa-calendar-check" />
              <span>
                {dayCount === 1
                  ? `1 día seleccionado: ${form.fechaInicio}`
                  : `${dayCount} días seleccionados: ${form.fechaInicio} → ${form.fechaFin}`
                }
              </span>
            </div>
          )}

          {dayCount > 1 && (
            <div className="admin-field">
              <label className="admin-field-label">Previsualizar mapa para fecha específica (opcional)</label>
              <input
                className="admin-input"
                type="date"
                value={previewDate}
                min={form.fechaInicio}
                max={form.fechaFin}
                onChange={e => setPreviewDate(e.target.value)}
                placeholder="Ver estado de pistas en un día"
              />
            </div>
          )}

          <div className="admin-field">
            <label className="admin-field-label">
              Selecciona las pistas a bloquear
              {form.pistas.length > 0 && (
                <span className="admin-pistas-count"> — {form.pistas.length} seleccionada{form.pistas.length > 1 ? 's' : ''}: {form.pistas.map(p => `P${p}`).join(', ')}</span>
              )}
            </label>
            <div className="admin-floorplan-wrapper">
              <FloorPlan
                selectedPistas={form.pistas}
                onTogglePista={togglePista}
                blockedLanes={blockedForMapDate}
              />
            </div>
          </div>

          <div className="admin-field">
            <label className="admin-field-label">Duración del bloqueo</label>
            <div className="admin-radio-group">
              <label className="admin-radio">
                <input type="radio" checked={form.todoElDia} onChange={() => handleChange('todoElDia', true)} />
                <span>Todo el día</span>
              </label>
              <label className="admin-radio">
                <input type="radio" checked={!form.todoElDia} onChange={() => handleChange('todoElDia', false)} />
                <span>Horarios específicos</span>
              </label>
            </div>
          </div>

          {!form.todoElDia && (
            <div className="admin-field">
              <label className="admin-field-label">Selecciona horarios a bloquear</label>
              <div className="admin-horas-grid">
                {ALL_HORAS.map(h => (
                  <button
                    key={h}
                    type="button"
                    className={`admin-hora-chip ${form.horas.includes(h) ? 'active' : ''}`}
                    onClick={() => toggleHora(h)}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="admin-field">
            <label className="admin-field-label">Motivo (opcional)</label>
            <input className="admin-input" value={form.motivo} onChange={e => handleChange('motivo', e.target.value)} placeholder="Ej: Mantenimiento, Evento privado..." />
          </div>

          {form.pistas.length > 0 && dayCount > 0 && (
            <div className="admin-bloqueo-summary">
              <i className="fas fa-info-circle" />
              <span>
                Se crearán <b>{form.pistas.length}</b> bloqueo{form.pistas.length > 1 ? 's' : ''} para{' '}
                <b>{dayCount}</b> día{dayCount > 1 ? 's' : ''}{' '}
                ({form.todoElDia ? 'todo el día' : `${form.horas.length} hora${form.horas.length !== 1 ? 's' : ''}`})
              </span>
            </div>
          )}

          <div className="admin-form-actions">
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={saving || form.pistas.length === 0 || !form.fechaInicio || !form.fechaFin}
            >
              <i className={saving ? 'fas fa-spinner fa-spin' : 'fas fa-ban'} />
              {saving ? 'Guardando…' : `Crear Bloqueo${form.pistas.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      )}

      {sortedBloqueos.length > 0 && (
        <div className="admin-bloqueos-filtros">
          <div className="admin-field admin-field-flex" style={{ minWidth: 160, margin: 0 }}>
            <label className="admin-field-label">Fecha</label>
            <input
              className="admin-input"
              type="date"
              value={filtroFecha}
              onChange={e => setFiltroFecha(e.target.value)}
            />
          </div>
          <div className="admin-field admin-field-flex" style={{ minWidth: 140, margin: 0 }}>
            <label className="admin-field-label">Hora</label>
            <select className="admin-input" value={filtroHora} onChange={e => setFiltroHora(e.target.value)}>
              <option value="">Todas</option>
              {ALL_HORAS.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div className="admin-field admin-field-flex" style={{ minWidth: 120, margin: 0 }}>
            <label className="admin-field-label">Pista</label>
            <select className="admin-input" value={filtroPista} onChange={e => setFiltroPista(e.target.value)}>
              <option value="">Todas</option>
              {PISTA_OPTIONS.map(p => <option key={p} value={String(p)}>Pista {p}</option>)}
            </select>
          </div>
          <button type="button" className="admin-bloqueos-clear" onClick={limpiarFiltros} title="Quitar filtros">
            <i className="fas fa-eraser" /> Limpiar
          </button>
          <span className="admin-bloqueos-filtros-count">
            Mostrando <strong>{bloqueosFiltrados.length}</strong> de {sortedBloqueos.length}
          </span>
        </div>
      )}

      <div className="admin-list">
        {sortedBloqueos.length === 0 ? (
          <div className="admin-empty">
            <i className="fas fa-check-circle" />
            <p>No hay pistas bloqueadas</p>
          </div>
        ) : bloqueosFiltrados.length === 0 ? (
          <div className="admin-empty">
            <i className="fas fa-filter" />
            <p>Ningún bloqueo coincide con los filtros</p>
            <button type="button" className="admin-btn admin-btn-primary" style={{ marginTop: 12 }} onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          </div>
        ) : (
          bloqueosFiltrados.map(b => (
            <div key={b.id} className="admin-card admin-bloqueo-card">
              <div className="admin-card-body">
                <div className="admin-card-top">
                  <h4 className="admin-card-title">Pista {b.pista}</h4>
                  <span className="admin-badge badge-red">
                    {b.horas.length === 0 ? 'Todo el día' : `${b.horas.length} hora(s)`}
                  </span>
                </div>
                <div className="admin-card-meta">
                  <span>
                    <i className="far fa-calendar" /> {formatRange(b)}
                  </span>
                  {b.horas.length > 0 && (
                    <span><i className="far fa-clock" /> {b.horas.join(', ')}</span>
                  )}
                </div>
                {b.motivo && <p className="admin-card-desc"><i className="fas fa-info-circle" /> {b.motivo}</p>}
              </div>
              <div className="admin-card-actions">
                <button
                  className="admin-btn-icon admin-btn-danger"
                  title="Eliminar bloqueo"
                  type="button"
                  onClick={async () => {
                    try {
                      await deleteBloqueo(b.id)
                    } catch (err) {
                      window.alert(`No se pudo eliminar: ${err.message || err}`)
                    }
                  }}
                >
                  <i className="fas fa-trash" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
