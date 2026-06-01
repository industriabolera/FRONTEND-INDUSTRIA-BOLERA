import { useMemo, useState } from 'react'
import { useBolera } from '../../context/BoleraContext'
import FloorPlan from '../FloorPlan'
import {
  LANES,
  ADMIN_STANDARD_HORAS as ALL_HORAS,
  mergeReservasParaPlano,
  reservationsForDate,
  reservationsAtSlot,
  bloqueoMotivoLaneSlot,
} from '../../utils/adminReservasGrid'
import {
  PLANO_OCUPACION_CSV_HEADERS,
  downloadUtf8Csv,
  reservaToCsvDetailCells,
} from '../../utils/adminReservasExport'

function laneTieneBloqueoAdmin(bloqueos, fechaStr, pista, hora) {
  return bloqueoMotivoLaneSlot(bloqueos, fechaStr, pista, hora) !== ''
}

function laneTieneReserva(reservasDia, fechaStr, pista, hora) {
  return reservationsAtSlot(reservasDia, fechaStr, pista, hora) != null
}

function blockedLanesWholeDayAgg({
  fechaStr,
  horasDia,
  isLaneBlocked,
  isLaneReservedAdmin,
  isLaneReservedOnline,
}) {
  if (!fechaStr || !horasDia?.length) return []
  return LANES.filter((pista) => {
    const todasOcupadas = horasDia.every(
      hora =>
        isLaneBlocked(pista, fechaStr, hora) ||
        isLaneReservedAdmin(pista, fechaStr, hora) ||
        isLaneReservedOnline(pista, fechaStr, hora)
    )
    return todasOcupadas
  })
}

/** @param {{ reservas: object[] }} props */
export default function AdminPlanoDia({ reservas }) {
  const {
    config,
    isLaneFullDayBlocked,
  } = useBolera()
  const [fecha, setFecha] = useState(() => {
    const t = new Date()
    const m = `${t.getMonth() + 1}`.padStart(2, '0')
    const d = `${t.getDate()}`.padStart(2, '0')
    return `${t.getFullYear()}-${m}-${d}`
  })

  /** '' = día completo (plano muestra ocupación máxima agregada por pista). */
  const [horaSel, setHoraSel] = useState('')

  const reservasFuente = useMemo(
    () => mergeReservasParaPlano(reservas, config.reservasAdmin),
    [reservas, config.reservasAdmin]
  )

  const reservasDia = useMemo(() => reservationsForDate(reservasFuente, fecha), [reservasFuente, fecha])

  const blockedAdminLanes = useMemo(() => {
    if (!fecha) return []
    return LANES.filter(p => {
      if (isLaneFullDayBlocked(p, fecha)) return true
      if (!horaSel) return false
      return laneTieneBloqueoAdmin(config.bloqueos, fecha, p, horaSel)
    })
  }, [fecha, horaSel, config.bloqueos, isLaneFullDayBlocked])

  const reservedClientLanes = useMemo(() => {
    if (!fecha || !horaSel) return []
    return LANES.filter(
      p => !blockedAdminLanes.includes(p) && laneTieneReserva(reservasDia, fecha, p, horaSel)
    )
  }, [fecha, horaSel, blockedAdminLanes, reservasDia])

  const blockedWholeDayMerged = useMemo(
    () =>
      blockedLanesWholeDayAgg({
        fechaStr: fecha,
        horasDia: ALL_HORAS,
        isLaneBlocked: (pi, fd, hr) =>
          laneTieneBloqueoAdmin(config.bloqueos, fd, pi, hr) || isLaneFullDayBlocked(pi, fd),
        isLaneReservedAdmin: (pi, fd, hr) => laneTieneReserva(reservasDia, fd, pi, hr),
        isLaneReservedOnline: (pi, fd, hr) => laneTieneReserva(reservasDia, fd, pi, hr),
      }),
    [fecha, config.bloqueos, reservasDia, isLaneFullDayBlocked]
  )

  /** Vista día agregado: morado si hay venta/reserva en ≥1 hueco estándar; gris solo si ese día está 100% lleno. */
  const reservedLanesSomeSlot = useMemo(() => {
    if (!fecha || horaSel) return []
    return LANES.filter(p => {
      if (blockedWholeDayMerged.includes(p)) return false
      return ALL_HORAS.some(h => laneTieneReserva(reservasDia, fecha, p, h))
    })
  }, [fecha, horaSel, blockedWholeDayMerged, reservasDia])

  const blockedForMap = horaSel ? blockedAdminLanes : blockedWholeDayMerged
  const reservedForMap = horaSel ? reservedClientLanes : reservedLanesSomeSlot

  const footerPlano =
    fecha && horaSel
      ? 'Gris: bloqueo administrativo (o todo el día). Morado: reserva confirmada o pendiente (online o manual).'
      : 'Vista día: morado = hay al menos una reserva ese día; gris = sin ningún slot libre de 12:00 PM a 10:00 PM. Elige una hora para ver bloqueos y reservas en ese turno.'

  const exportarCsv = () => {
    if (!fecha) return
    const rows = [PLANO_OCUPACION_CSV_HEADERS]
    const emptyDetail = reservaToCsvDetailCells(null)

    for (const pista of LANES) {
      for (const hora of ALL_HORAS) {
        const bloqueoTxt = bloqueoMotivoLaneSlot(config.bloqueos, fecha, pista, hora)
        if (bloqueoTxt) {
          rows.push([fecha, pista, hora, 'Bloqueada (admin)', bloqueoTxt, ...emptyDetail])
          continue
        }

        const r = reservationsAtSlot(reservasDia, fecha, pista, hora)
        if (r) {
          const estadoSlot = r.estado === 'pendiente' ? 'Apartada/Pendiente' : 'Reservada (vendida)'
          rows.push([fecha, pista, hora, estadoSlot, '', ...reservaToCsvDetailCells(r)])
          continue
        }

        rows.push([fecha, pista, hora, 'Disponible', '', ...emptyDetail])
      }
    }

    downloadUtf8Csv(`pistas-ocupacion_${fecha}.csv`, rows)
  }

  const conteoVendidas = useMemo(() => {
    let n = 0
    for (const pista of LANES) {
      for (const hora of ALL_HORAS) {
        if (bloqueoMotivoLaneSlot(config.bloqueos, fecha, pista, hora))
          continue
        const r = reservationsAtSlot(reservasDia, fecha, pista, hora)
        if (r && r.estado === 'exitosa')
          n += 1
      }
    }
    return n
  }, [fecha, config.bloqueos, reservasDia])

  return (
    <div className="admin-card admin-form-card admin-plano-dia-card">
      <div className="admin-plano-dia-toolbar">
        <div>
          <h3 className="admin-plano-dia-title">
            <i className="fas fa-map" /> Plano del día
          </h3>
          <p className="admin-panel-desc" style={{ marginTop: 4, marginBottom: 0 }}>
            Visualiza ocupación por pista{' '}
            {horaSel
              ? `a las ${horaSel} (morado = reserva, gris = bloqueo admin).`
              : '(vista día: morado = al menos una venta/reserva; gris = todos los turnos estándar ocupados).'}
          </p>
        </div>
        <button type="button" className="admin-btn admin-btn-primary" onClick={exportarCsv}>
          <i className="fas fa-file-download" /> Exportar Excel (CSV)
        </button>
      </div>
      <div className="admin-form-row admin-form-row-3" style={{ marginTop: 12 }}>
        <div className="admin-field">
          <label className="admin-field-label">Fecha</label>
          <input className="admin-input" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-field-label">Hora (opcional)</label>
          <select className="admin-input" value={horaSel} onChange={e => setHoraSel(e.target.value)}>
            <option value="">Todo el día (agregado)</option>
            {ALL_HORAS.map(h => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-field" style={{ display: 'flex', alignItems: 'flex-end' }}>
          <p className="admin-plano-dia-stats">
            Slots vendidos confirmados ese día (12:00 PM - 10:00 PM): <strong>{conteoVendidas}</strong>
          </p>
        </div>
      </div>

      <div className="admin-floorplan-wrapper" style={{ marginTop: 8 }}>
        <FloorPlan
          readOnly
          selectedPistas={[]}
          onTogglePista={() => {}}
          blockedLanes={blockedForMap}
          reservedLanes={reservedForMap}
          footerHint={footerPlano}
        />
      </div>
    </div>
  )
}
