import { useState, useEffect, useMemo, useCallback } from 'react'
import { useBolera } from '../../context/BoleraContext'
import { fetchAllReservasForAdminPortal } from '../../utils/adminReservasFetch'
import BookingCalendarMini from '../BookingCalendarMini'
import {
  LANES,
  toDateStr,
  parseFechaInput,
  getHorariosForDate,
  mergeReservasParaPlano,
  reservationsForDate,
  buildLaneSegments,
  reservasDiaOrdenadas,
  slotsFromReserva,
  clienteNombreReserva,
  buildHolidaysSet,
} from '../../utils/adminReservasGrid'

const ESTADO_CELL = {
  exitosa: { cls: 'cronograma-cell--exitosa', label: 'Confirmada' },
  pendiente: { cls: 'cronograma-cell--pendiente', label: 'Pendiente' },
  manual: { cls: 'cronograma-cell--manual', label: 'Manual' },
  rechazada: { cls: 'cronograma-cell--rechazada', label: 'Rechazada' },
  cancelada: { cls: 'cronograma-cell--cancelada', label: 'Cancelada' },
}

function formatFechaLarga(fechaStr) {
  const d = parseFechaInput(fechaStr)
  if (!d) return fechaStr
  return d.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatPrice(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)
}

export default function AdminCronograma() {
  const { config, isLaneFullDayBlocked } = useBolera()
  const [fecha, setFecha] = useState(() => toDateStr(new Date()))
  const [reservas, setReservas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)

  const holidaysSet = useMemo(() => {
    const y = parseFechaInput(fecha)?.getFullYear() ?? new Date().getFullYear()
    return buildHolidaysSet([y - 1, y, y + 1])
  }, [fecha])

  const fetchReservas = useCallback(async (opts = {}) => {
    const silent = Boolean(opts.silent)
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const list = await fetchAllReservasForAdminPortal()
      setReservas(list)
      setError(null)
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReservas({ silent: false })
    const id = setInterval(() => fetchReservas({ silent: true }), 30000)
    return () => clearInterval(id)
  }, [fetchReservas])

  const fechaDate = useMemo(() => parseFechaInput(fecha), [fecha])
  const horasDia = useMemo(
    () => getHorariosForDate(fechaDate, config.horarios, holidaysSet),
    [fechaDate, config.horarios, holidaysSet]
  )

  const reservasFuente = useMemo(
    () => mergeReservasParaPlano(reservas, config.reservasAdmin),
    [reservas, config.reservasAdmin]
  )

  const reservasDia = useMemo(
    () => reservationsForDate(reservasFuente, fecha),
    [reservasFuente, fecha]
  )

  const listaDia = useMemo(() => reservasDiaOrdenadas(reservasDia), [reservasDia])

  const gridRows = useMemo(() => {
    return LANES.map(pista => ({
      pista,
      segments: buildLaneSegments({
        pista,
        horasDia,
        reservasDia,
        bloqueos: config.bloqueos,
        fechaStr: fecha,
        isLaneFullDayBlocked,
      }),
    }))
  }, [horasDia, reservasDia, config.bloqueos, fecha, isLaneFullDayBlocked])

  const stats = useMemo(() => {
    let confirmadas = 0
    let pendientes = 0
    for (const r of listaDia) {
      if (r.estado === 'pendiente') pendientes += 1
      else if (r.estado === 'exitosa' || String(r.reference || '').startsWith('MANUAL-') || String(r.reference || '').startsWith('LOCAL-'))
        confirmadas += 1
    }
    return { total: listaDia.length, confirmadas, pendientes }
  }, [listaDia])

  const handleFechaChange = (next) => {
    setFecha(next)
    setSelected(null)
  }

  return (
    <div className="admin-cronograma">
      <div className="admin-cronograma-shell">
        <aside className="admin-cronograma-calendar-col admin-card">
          <BookingCalendarMini
            value={fecha}
            onChange={handleFechaChange}
            allowPastDays
            showHoyButton
          />
          <button
            type="button"
            className="admin-btn admin-btn-primary admin-cronograma-refresh"
            onClick={() => fetchReservas({ silent: false })}
            disabled={loading}
          >
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} /> Actualizar
          </button>
        </aside>

        <div className="admin-cronograma-body">
          <div className="admin-cronograma-header">
            <h3 className="admin-plano-dia-title">
              <i className="fas fa-calendar-week" /> Cronograma del día
            </h3>
            <p className="admin-panel-desc admin-cronograma-desc">
              {formatFechaLarga(fecha)} — reservas y bloqueos por pista y horario.
            </p>
          </div>

          {error && (
            <div className="admin-cronograma-error">
              <i className="fas fa-exclamation-triangle" /> {error}
              <button type="button" onClick={() => fetchReservas({ silent: false })}>Reintentar</button>
            </div>
          )}

          <div className="admin-cronograma-layout">
        <aside className="admin-cronograma-sidebar admin-card">
          <h4 className="admin-cronograma-sidebar-title">
            Reservas del día
            <span className="admin-cronograma-badge">{stats.total}</span>
          </h4>
          <p className="admin-cronograma-sidebar-stats">
            {stats.confirmadas} confirmada{stats.confirmadas !== 1 ? 's' : ''}
            {stats.pendientes > 0 && <> · {stats.pendientes} pendiente{stats.pendientes !== 1 ? 's' : ''}</>}
          </p>
          {loading && listaDia.length === 0 ? (
            <p className="admin-cronograma-empty"><i className="fas fa-spinner fa-spin" /> Cargando…</p>
          ) : listaDia.length === 0 ? (
            <p className="admin-cronograma-empty">No hay reservas activas este día.</p>
          ) : (
            <ul className="admin-cronograma-list">
              {listaDia.map(r => {
                const slots = slotsFromReserva(r)
                const hora = slots[0]?.hora || '—'
                const pistas = [...new Set(slots.map(s => s.pista))].sort((a, b) => a - b)
                const estado = ESTADO_CELL[r.estado] || ESTADO_CELL.exitosa
                const isSel = selected?.reference === r.reference
                return (
                  <li key={r.reference || r.id}>
                    <button
                      type="button"
                      className={`admin-cronograma-list-item ${estado.cls} ${isSel ? 'is-selected' : ''}`}
                      onClick={() => setSelected(r)}
                    >
                      <span className="admin-cronograma-list-time">{hora}</span>
                      <span className="admin-cronograma-list-name">{clienteNombreReserva(r)}</span>
                      <span className="admin-cronograma-list-meta">
                        P{pistas.join(',')} · {estado.label}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <div className="admin-cronograma-grid-wrap admin-card">
          <div className="admin-cronograma-legend">
            <span><i className="cronograma-swatch cronograma-swatch--exitosa" /> Confirmada</span>
            <span><i className="cronograma-swatch cronograma-swatch--pendiente" /> Pendiente</span>
            <span><i className="cronograma-swatch cronograma-swatch--manual" /> Manual / local</span>
            <span><i className="cronograma-swatch cronograma-swatch--bloqueo" /> Bloqueo</span>
            <span><i className="cronograma-swatch cronograma-swatch--libre" /> Disponible</span>
          </div>

          <div className="admin-cronograma-scroll">
            <table className="admin-cronograma-table">
              <thead>
                <tr>
                  <th className="admin-cronograma-th-lane">Pista</th>
                  {horasDia.map(h => (
                    <th key={h} className="admin-cronograma-th-hour">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gridRows.map(({ pista, segments }) => (
                  <tr key={pista}>
                    <th className="admin-cronograma-lane-label">Pista {pista}</th>
                    {segments.map((seg, idx) => {
                      if (seg.type === 'libre') {
                        return (
                          <td
                            key={`${pista}-libre-${idx}`}
                            colSpan={seg.span}
                            className="cronograma-cell cronograma-cell--libre"
                            title="Disponible"
                          />
                        )
                      }
                      if (seg.type === 'bloqueo') {
                        return (
                          <td
                            key={`${pista}-blk-${idx}`}
                            colSpan={seg.span}
                            className="cronograma-cell cronograma-cell--bloqueo"
                            title={seg.motivo}
                          >
                            <span className="cronograma-cell-text">Bloqueo</span>
                          </td>
                        )
                      }
                      const r = seg.reserva
                      const estado = ESTADO_CELL[r.estado] || (
                        String(r.reference || '').startsWith('MANUAL-') || String(r.reference || '').startsWith('LOCAL-')
                          ? ESTADO_CELL.manual
                          : ESTADO_CELL.exitosa
                      )
                      const isSel = selected?.reference === r.reference
                      return (
                        <td
                          key={`${pista}-res-${idx}`}
                          colSpan={seg.span}
                          className={`cronograma-cell cronograma-cell--reserva ${estado.cls} ${isSel ? 'is-selected' : ''}`}
                          title={`${clienteNombreReserva(r)} · ${estado.label} · ${seg.horas.join(', ')}`}
                          onClick={() => setSelected(r)}
                        >
                          <span className="cronograma-cell-text">{seg.label}</span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
          </div>

          {selected && (
            <div className="admin-cronograma-detail admin-card">
              <div className="admin-cronograma-detail-header">
                <h4><i className="fas fa-info-circle" /> Detalle</h4>
                <button type="button" className="admin-cronograma-detail-close" onClick={() => setSelected(null)} aria-label="Cerrar">
                  <i className="fas fa-times" />
                </button>
              </div>
              <div className="admin-cronograma-detail-grid">
                <div><span>Cliente</span><strong>{clienteNombreReserva(selected)}</strong></div>
                <div><span>Referencia</span><strong>{selected.reference || '—'}</strong></div>
                <div><span>Estado</span><strong>{ESTADO_CELL[selected.estado]?.label || selected.estado}</strong></div>
                <div><span>Total</span><strong>{formatPrice(selected.total)}</strong></div>
                <div className="admin-cronograma-detail-wide">
                  <span>Pistas y horarios</span>
                  <strong>
                    {slotsFromReserva(selected).map(s => `P${s.pista} ${s.hora}`).join(' · ') || '—'}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
