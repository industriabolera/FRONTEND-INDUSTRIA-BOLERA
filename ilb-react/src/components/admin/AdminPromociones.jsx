import { useState } from 'react'
import { useBolera } from '../../context/BoleraContext'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const EMPTY_PROMO = {
  nombre: '',
  descripcion: '',
  tipo: 'porcentaje',
  valor: 0,
  minHoras: 2,
  fechaInicio: '',
  fechaFin: '',
  diasSemana: [],
  activa: true,
}

export default function AdminPromociones() {
  const { config, addPromocion, updatePromocion, deletePromocion } = useBolera()
  const [form, setForm] = useState(EMPTY_PROMO)
  const [showForm, setShowForm] = useState(false)

  const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const toggleDia = (dia) => {
    setForm(prev => ({
      ...prev,
      diasSemana: prev.diasSemana.includes(dia)
        ? prev.diasSemana.filter(d => d !== dia)
        : [...prev.diasSemana, dia]
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.nombre || !form.fechaInicio || !form.fechaFin) return
    addPromocion(form)
    setForm(EMPTY_PROMO)
    setShowForm(false)
  }

  const formatTipo = (promo) => {
    if (promo.tipo === 'porcentaje') return `${promo.valor}% de descuento`
    if (promo.tipo === 'valor') return `$${promo.valor.toLocaleString('es-CO')} de descuento`
    return `2×1 (mín. ${promo.minHoras || 2} hora${(promo.minHoras || 2) > 1 ? 's' : ''})`
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <p className="admin-panel-desc">
          Crea promociones por rango de fechas y días de la semana. Ejemplo: "Martes 2×1 en Febrero".
        </p>
        <button className="admin-btn admin-btn-primary" onClick={() => setShowForm(!showForm)}>
          <i className={showForm ? 'fas fa-times' : 'fas fa-plus'} />
          {showForm ? 'Cancelar' : 'Nueva Promoción'}
        </button>
      </div>

      {showForm && (
        <form className="admin-card admin-form-card" onSubmit={handleSubmit}>
          <div className="admin-form-row">
            <div className="admin-field admin-field-flex">
              <label className="admin-field-label">Nombre</label>
              <input
                className="admin-input"
                value={form.nombre}
                onChange={e => handleChange('nombre', e.target.value)}
                placeholder="Ej: Martes 2×1 Febrero"
                required
              />
            </div>
          </div>

          <div className="admin-form-row">
            <div className="admin-field admin-field-flex">
              <label className="admin-field-label">Descripción</label>
              <input
                className="admin-input"
                value={form.descripcion}
                onChange={e => handleChange('descripcion', e.target.value)}
                placeholder="Ej: Juega 2 horas o 1 hora en 2 pistas"
              />
            </div>
          </div>

          <div className="admin-form-row admin-form-row-3">
            <div className="admin-field">
              <label className="admin-field-label">Tipo</label>
              <select className="admin-input" value={form.tipo} onChange={e => handleChange('tipo', e.target.value)}>
                <option value="porcentaje">% Descuento</option>
                <option value="valor">$ Descuento fijo</option>
                <option value="2x1">2×1 en pistas</option>
              </select>
            </div>
            {form.tipo !== '2x1' && (
              <div className="admin-field">
                <label className="admin-field-label">{form.tipo === 'porcentaje' ? 'Porcentaje' : 'Valor ($)'}</label>
                <input
                  className="admin-input"
                  type="number"
                  min="0"
                  value={form.valor}
                  onChange={e => handleChange('valor', parseInt(e.target.value) || 0)}
                />
              </div>
            )}
            {form.tipo === '2x1' && (
              <div className="admin-field">
                <label className="admin-field-label">Mínimo de horas para activar</label>
                <input
                  className="admin-input"
                  type="number"
                  min="2"
                  value={form.minHoras}
                  onChange={e => handleChange('minHoras', Math.max(2, parseInt(e.target.value) || 2))}
                />
              </div>
            )}
          </div>

          {form.tipo === '2x1' && (
            <div className="admin-promo-2x1-info">
              <i className="fas fa-info-circle" />
              <div>
                <strong>¿Cómo funciona el 2×1?</strong>
                <p>
                  Por cada 2 horas reservadas, el cliente paga solo 1.
                  Se activa únicamente si reserva al menos <b>{form.minHoras}</b> hora{form.minHoras > 1 ? 's' : ''}.
                  Aplica tanto para 2 horas en la misma pista como para 1 hora en 2 pistas diferentes.
                </p>
                <p className="admin-promo-2x1-example">
                  Ejemplo: si reserva {form.minHoras} hora{form.minHoras > 1 ? 's' : ''} a $120.000 c/u → paga {Math.ceil(form.minHoras / 2)} hora{Math.ceil(form.minHoras / 2) > 1 ? 's' : ''} = ${(120000 * Math.ceil(form.minHoras / 2)).toLocaleString('es-CO')}
                </p>
              </div>
            </div>
          )}

          <div className="admin-form-row admin-form-row-2">
            <div className="admin-field">
              <label className="admin-field-label">Fecha Inicio</label>
              <input className="admin-input" type="date" value={form.fechaInicio} onChange={e => handleChange('fechaInicio', e.target.value)} required />
            </div>
            <div className="admin-field">
              <label className="admin-field-label">Fecha Fin</label>
              <input className="admin-input" type="date" value={form.fechaFin} onChange={e => handleChange('fechaFin', e.target.value)} required />
            </div>
          </div>

          <div className="admin-field">
            <label className="admin-field-label">Días de la semana (vacío = todos)</label>
            <div className="admin-dias-grid">
              {DIAS.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  className={`admin-dia-chip ${form.diasSemana.includes(i) ? 'active' : ''}`}
                  onClick={() => toggleDia(i)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-form-actions">
            <button type="submit" className="admin-btn admin-btn-primary">
              <i className="fas fa-plus-circle" /> Crear Promoción
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="admin-list">
        {config.promociones.length === 0 ? (
          <div className="admin-empty">
            <i className="fas fa-percent" />
            <p>No hay promociones configuradas</p>
          </div>
        ) : (
          config.promociones.map(promo => (
            <div key={promo.id} className={`admin-card admin-promo-card ${!promo.activa ? 'inactive' : ''}`}>
              <div className="admin-card-body">
                <div className="admin-card-top">
                  <h4 className="admin-card-title">{promo.nombre}</h4>
                  <span className={`admin-badge ${promo.activa ? 'badge-green' : 'badge-gray'}`}>
                    {promo.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                {promo.descripcion && <p className="admin-card-desc">{promo.descripcion}</p>}
                <div className="admin-card-meta">
                  <span><i className="fas fa-tag" /> {formatTipo(promo)}</span>
                  <span><i className="far fa-calendar" /> {promo.fechaInicio} → {promo.fechaFin}</span>
                  {promo.diasSemana.length > 0 && (
                    <span><i className="far fa-clock" /> {promo.diasSemana.map(d => DIAS[d]).join(', ')}</span>
                  )}
                </div>
              </div>
              <div className="admin-card-actions">
                <button
                  className="admin-btn-icon"
                  title={promo.activa ? 'Desactivar' : 'Activar'}
                  onClick={() => updatePromocion(promo.id, { activa: !promo.activa })}
                >
                  <i className={promo.activa ? 'fas fa-toggle-on' : 'fas fa-toggle-off'} />
                </button>
                <button className="admin-btn-icon admin-btn-danger" title="Eliminar" onClick={() => deletePromocion(promo.id)}>
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
