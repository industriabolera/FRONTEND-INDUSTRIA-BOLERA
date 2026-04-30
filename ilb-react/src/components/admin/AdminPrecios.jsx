import { useEffect, useState } from 'react'
import { useBolera } from '../../context/BoleraContext'

function formatPrice(v) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v)
}

const ALL_HOURS = [
  '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
  '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM',
  '10:00 PM', '11:00 PM', '12:00 AM',
]

const HORARIO_GROUPS = [
  { key: 'lunMie', label: 'Lunes - Miércoles', icon: 'fas fa-briefcase' },
  { key: 'jueSab', label: 'Jueves - Sábado', icon: 'fas fa-glass-cheers' },
  { key: 'domFest', label: 'Domingos y Festivos', icon: 'fas fa-sun' },
]

export default function AdminPrecios() {
  const { config, updatePrecios, updateHorarios } = useBolera()
  const [form, setForm] = useState({ ...config.precios })
  const [horarioForm, setHorarioForm] = useState({ ...config.horarios })
  const [savedPrecios, setSavedPrecios] = useState(false)
  const [savedHorarios, setSavedHorarios] = useState(false)

  useEffect(() => {
    setForm({ ...config.precios })
  }, [config.precios])

  useEffect(() => {
    setHorarioForm({ ...config.horarios })
  }, [config.horarios])

  const handlePriceChange = (key, value) => {
    const num = parseInt(value.replace(/\D/g, ''), 10) || 0
    setForm(prev => ({ ...prev, [key]: num }))
    setSavedPrecios(false)
  }

  const handleSavePrecios = () => {
    updatePrecios(form)
    setSavedPrecios(true)
    setTimeout(() => setSavedPrecios(false), 3000)
  }

  const handleHorarioChange = (groupKey, field, value) => {
    setHorarioForm(prev => ({
      ...prev,
      [groupKey]: { ...prev[groupKey], [field]: value }
    }))
    setSavedHorarios(false)
  }

  const handleSaveHorarios = () => {
    updateHorarios(horarioForm)
    setSavedHorarios(true)
    setTimeout(() => setSavedHorarios(false), 3000)
  }

  const fields = [
    { key: 'pistaLJ', label: 'Pista Lunes - Jueves', desc: 'Precio base por pista en días de semana' },
    { key: 'pistaVD', label: 'Pista Viernes - Domingo', desc: 'Precio base por pista en fines de semana' },
    { key: 'zapatos', label: 'Zapatos y Medias', desc: 'Precio por persona' },
    { key: 'jugadorAdicional', label: 'Jugador Adicional', desc: 'Costo del 7° jugador' },
  ]

  return (
    <div className="admin-panel">
      {/* === PRECIOS === */}
      <div className="admin-section-block">
        <h3 className="admin-section-heading">
          <i className="fas fa-tags" /> Precios
        </h3>
        <p className="admin-panel-desc">Configura los precios base. Los cambios se aplican inmediatamente en la página de reservas.</p>

        <div className="admin-form-grid">
          {fields.map(f => (
            <div key={f.key} className="admin-field">
              <label className="admin-field-label">{f.label}</label>
              <p className="admin-field-desc">{f.desc}</p>
              <div className="admin-input-price">
                <span className="admin-input-prefix">$</span>
                <input
                  type="text"
                  value={form[f.key].toLocaleString('es-CO')}
                  onChange={e => handlePriceChange(f.key, e.target.value)}
                  className="admin-input"
                />
                <span className="admin-input-suffix">COP</span>
              </div>
              <span className="admin-field-current">
                Actual: {formatPrice(config.precios[f.key])}
              </span>
            </div>
          ))}
        </div>

        <div className="admin-form-actions">
          <button className="admin-btn admin-btn-primary" onClick={handleSavePrecios}>
            <i className="fas fa-save" /> Guardar Precios
          </button>
          {savedPrecios && <span className="admin-saved-msg"><i className="fas fa-check-circle" /> Precios actualizados</span>}
        </div>
      </div>

      {/* === HORARIOS === */}
      <div className="admin-section-block">
        <h3 className="admin-section-heading">
          <i className="far fa-clock" /> Horarios de Operación
        </h3>
        <p className="admin-panel-desc">Define la hora de apertura y cierre para cada grupo de días. Los horarios disponibles en la reserva se generan automáticamente.</p>

        <div className="admin-horarios-grid">
          {HORARIO_GROUPS.map(g => (
            <div key={g.key} className="admin-horario-card">
              <div className="admin-horario-header">
                <i className={g.icon} />
                <span>{g.label}</span>
              </div>
              <div className="admin-horario-fields">
                <div className="admin-field">
                  <label className="admin-field-label">Apertura</label>
                  <select
                    className="admin-input"
                    value={horarioForm[g.key].apertura}
                    onChange={e => handleHorarioChange(g.key, 'apertura', e.target.value)}
                  >
                    {ALL_HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="admin-field">
                  <label className="admin-field-label">Cierre</label>
                  <select
                    className="admin-input"
                    value={horarioForm[g.key].cierre}
                    onChange={e => handleHorarioChange(g.key, 'cierre', e.target.value)}
                  >
                    {ALL_HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
              <span className="admin-field-current">
                Actual: {config.horarios[g.key].apertura} — {config.horarios[g.key].cierre}
              </span>
            </div>
          ))}
        </div>

        <div className="admin-form-actions">
          <button className="admin-btn admin-btn-primary" onClick={handleSaveHorarios}>
            <i className="fas fa-save" /> Guardar Horarios
          </button>
          {savedHorarios && <span className="admin-saved-msg"><i className="fas fa-check-circle" /> Horarios actualizados</span>}
        </div>
      </div>
    </div>
  )
}
