import { useMemo, useState } from 'react'
import { useBolera } from '../../context/BoleraContext'
import FloorPlan from '../FloorPlan'
import { parseHorasFromString } from '../../utils/bookingSlots'

const ALL_HORAS = [
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
  '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM',
]

const LANES = Array.from({ length: 11 }, (_, i) => i + 1)

function reservationsForDate(reservas, fechaStr) {
  return (reservas || []).filter(r => r.fecha === fechaStr && r.estado !== 'cancelada' && r.estado !== 'rechazada')
}

/** Slots normalizados: admite `horas` tipo P1:…|… o legacy `pista` + `hora`. */
function slotsFromReserva(r) {
  const parsed = parseHorasFromString(r?.horas)
  if (parsed.length) return parsed
  if (r?.pista != null && r?.hora)
    return [{ pista: Number(r.pista), hora: String(r.hora).trim() }]
  return []
}

/** Lista API + manual guardado sólo en localStorage (forma antigua por pista/hora). */
function mergeReservasParaPlano(reservasApi, reservasAdminLocal) {
  const out = [...(reservasApi || [])]
  for (const r of reservasAdminLocal || []) {
    if (!r?.fecha || r.pista == null || !r.hora) continue
    const pid = Number(r.pista)
    const h = String(r.hora).trim()
    const dupe = out.some(x => x.fecha === r.fecha && slotsFromReserva(x).some(s => Number(s.pista) === pid && s.hora === h))
    if (dupe) continue
    out.push({
      fecha: r.fecha,
      horas: `P${pid}:${h}`,
      estado: 'exitosa',
      reference: `LOCAL-${r.id || 'adm'}`,
      datosPersonales: { nombre: r.nombre },
    })
  }
  return out
}

function reservationsAtSlot(items, fechaStr, pista, hora) {
  for (const r of items) {
    if (r.fecha !== fechaStr) continue
    const hit = slotsFromReserva(r).some(
      s => Number(s.pista) === Number(pista) && s.hora === hora
    )
    if (hit)
      return r
  }
  return null
}

function escapeCsv(cell) {
  const s = String(cell ?? '')
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function downloadUtf8Csv(filename, rows) {
  const csv = rows.map(row => row.map(escapeCsv).join(',')).join('\r\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function bloqueoMotivoLaneSlot(bloqueos, fechaStr, pista, hora) {
  for (const b of bloqueos || []) {
    if (Number(b.pista) !== Number(pista)) continue
    if (b.fechaInicio && b.fechaFin) {
      if (fechaStr < b.fechaInicio || fechaStr > b.fechaFin) continue
    }
    else if (b.fecha && b.fecha !== fechaStr) {
      continue
    }
    const bh = Array.isArray(b.horas) ? b.horas : []
    if (bh.length === 0 || bh.includes(hora))
      return b.motivo || 'Bloqueo administrativo'
  }
  return ''
}

/** Bloqueo admin en ese slot de pista/fecha (misma semántica que el CSV). */
function laneTieneBloqueoAdmin(bloqueos, fechaStr, pista, hora) {
  return bloqueoMotivoLaneSlot(bloqueos, fechaStr, pista, hora) !== ''
}

/** Reserva válida ese día sobre esa pista+hora (incluye multi-slot en `horas`). */
function laneTieneReserva(reservasDia, fechaStr, pista, hora) {
  return reservationsAtSlot(reservasDia, fechaStr, pista, hora) != null
}

/** Pistas donde todas las horas estándar están ocupadas (bloqueo/reserva). */
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
    const header = ['Fecha', 'Pista', 'Hora', 'Estado', 'Detalle', 'Referencia', 'Cliente', 'Método pago', 'Origen']
    const rows = [header]

    for (const pista of LANES) {
      for (const hora of ALL_HORAS) {
        const bloqueoTxt = bloqueoMotivoLaneSlot(config.bloqueos, fecha, pista, hora)
        if (bloqueoTxt) {
          rows.push([fecha, pista, hora, 'Bloqueada (admin)', bloqueoTxt, '', '', '', ''])
          continue
        }

        const r = reservationsAtSlot(reservasDia, fecha, pista, hora)
        if (r) {
          rows.push([
            fecha,
            pista,
            hora,
            r.estado === 'pendiente' ? 'Apartada/Pendiente' : 'Reservada (vendida)',
            '',
            r.reference || '',
            r.datosPersonales?.nombre || '',
            r.metodoPago || '',
            r.origen || (String(r.reference || '').startsWith('MANUAL-') ? 'manual' : 'online'),
          ])
          continue
        }

        rows.push([fecha, pista, hora, 'Disponible', '', '', '', '', ''])
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
