import { useState } from 'react'
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
  nombre: '',
  telefono: '',
  notas: '',
}

export default function AdminReservas() {
  const { config, addReservaAdmin, deleteReservaAdmin, isLaneBlocked } = useBolera()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.fecha || !form.hora || !form.nombre) return
    addReservaAdmin(form)
    setForm(EMPTY_FORM)
    setShowForm(false)
  }

  const availableHoras = ALL_HORAS.filter(h => {
    if (!form.fecha) return true
    return !isLaneBlocked(form.pista, form.fecha, h)
  })

  const grouped = config.reservasAdmin.reduce((acc, r) => {
    if (!acc[r.fecha]) acc[r.fecha] = []
    acc[r.fecha].push(r)
    return acc
  }, {})

  const sortedDates = Object.keys(grouped).sort().reverse()

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <p className="admin-panel-desc">
          Crea reservas manuales desde el panel. Estas reservas bloquean el horario en la pista seleccionada.
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
              <select className="admin-input" value={form.pista} onChange={e => handleChange('pista', parseInt(e.target.value))}>
                {PISTAS.map(p => <option key={p} value={p}>Pista {p}</option>)}
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
              <input className="admin-input" type="number" min="1" max="7" value={form.personas} onChange={e => handleChange('personas', parseInt(e.target.value) || 1)} />
            </div>
            <div className="admin-field">
              <label className="admin-field-label">Notas (opcional)</label>
              <input className="admin-input" value={form.notas} onChange={e => handleChange('notas', e.target.value)} placeholder="Cumpleaños, evento especial..." />
            </div>
          </div>

          <div className="admin-form-actions">
            <button type="submit" className="admin-btn admin-btn-primary">
              <i className="fas fa-calendar-plus" /> Crear Reserva
            </button>
          </div>
        </form>
      )}

      <div className="admin-list">
        {sortedDates.length === 0 ? (
          <div className="admin-empty">
            <i className="fas fa-calendar" />
            <p>No hay reservas creadas desde el admin</p>
          </div>
        ) : (
          sortedDates.map(fecha => (
            <div key={fecha} className="admin-date-group">
              <h4 className="admin-date-heading">
                <i className="far fa-calendar" /> {fecha}
                <span className="admin-date-count">{grouped[fecha].length} reserva(s)</span>
              </h4>
              {grouped[fecha].sort((a, b) => a.hora.localeCompare(b.hora)).map(r => (
                <div key={r.id} className="admin-card admin-reserva-card">
                  <div className="admin-card-body">
                    <div className="admin-card-top">
                      <h4 className="admin-card-title">{r.nombre}</h4>
                      <span className="admin-badge badge-blue">Pista {r.pista} — {r.hora}</span>
                    </div>
                    <div className="admin-card-meta">
                      <span><i className="fas fa-users" /> {r.personas} personas</span>
                      {r.telefono && <span><i className="fas fa-phone" /> {r.telefono}</span>}
                      {r.notas && <span><i className="fas fa-sticky-note" /> {r.notas}</span>}
                    </div>
                  </div>
                  <div className="admin-card-actions">
                    <button className="admin-btn-icon admin-btn-danger" title="Eliminar reserva" onClick={() => deleteReservaAdmin(r.id)}>
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
