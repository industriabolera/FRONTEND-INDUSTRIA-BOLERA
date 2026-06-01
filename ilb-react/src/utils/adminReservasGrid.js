import { parseHorasFromString } from './bookingSlots'

export const LANES = Array.from({ length: 11 }, (_, i) => i + 1)

export const ALL_HOUR_SLOTS = [
  '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
  '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM',
  '10:00 PM', '11:00 PM', '12:00 AM',
]

/** Horas estándar del panel admin (plano / listados). */
export const ADMIN_STANDARD_HORAS = [
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
  '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM',
]

export function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function parseFechaInput(fechaStr) {
  if (!fechaStr) return null
  const [y, m, d] = fechaStr.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function getHorarioGroup(date, holidaysSet) {
  if (!date) return null
  if (holidaysSet && holidaysSet.has(toDateStr(date))) return 'domFest'
  const day = date.getDay()
  if (day === 0) return 'domFest'
  if (day >= 1 && day <= 3) return 'lunMie'
  return 'jueSab'
}

function generateSlots(apertura, cierre) {
  const startIdx = ALL_HOUR_SLOTS.indexOf(apertura)
  const endIdx = ALL_HOUR_SLOTS.indexOf(cierre)
  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) return []
  return ALL_HOUR_SLOTS.slice(startIdx, endIdx)
}

/** Horarios de reserva para una fecha según config de la bolera. */
export function getHorariosForDate(date, horarios, holidaysSet) {
  if (!date) return ADMIN_STANDARD_HORAS
  const group = getHorarioGroup(date, holidaysSet)
  if (!group || !horarios?.[group]) return ADMIN_STANDARD_HORAS
  const slots = generateSlots(horarios[group].apertura, horarios[group].cierre)
  return slots.length ? slots : ADMIN_STANDARD_HORAS
}

export function slotsFromReserva(r) {
  const parsed = parseHorasFromString(r?.horas)
  if (parsed.length) return parsed
  if (r?.pista != null && r?.hora)
    return [{ pista: Number(r.pista), hora: String(r.hora).trim() }]
  return []
}

export function mergeReservasParaPlano(reservasApi, reservasAdminLocal) {
  const out = [...(reservasApi || [])]
  for (const r of reservasAdminLocal || []) {
    if (!r?.fecha || r.pista == null || !r.hora) continue
    const pid = Number(r.pista)
    const h = String(r.hora).trim()
    const dupe = out.some(x =>
      x.fecha === r.fecha && slotsFromReserva(x).some(s => Number(s.pista) === pid && s.hora === h)
    )
    if (dupe) continue
    out.push({
      fecha: r.fecha,
      horas: `P${pid}:${h}`,
      estado: 'exitosa',
      reference: `LOCAL-${r.id || 'adm'}`,
      personas: r.personas,
      metodoPago: r.metodoPago || '',
      notas: r.notas || '',
      datosPersonales: {
        nombre: r.nombre || '',
        telefono: r.telefono || '',
        correo: r.correo || '',
        tipoDocumento: r.tipoDocumento || '',
        documento: r.documento || '',
        fechaNacimiento: r.fechaNacimiento || '',
      },
      origen: 'manual',
    })
  }
  return out
}

export function reservationsForDate(reservas, fechaStr) {
  return (reservas || []).filter(r => r.fecha === fechaStr && r.estado !== 'cancelada' && r.estado !== 'rechazada')
}

export function reservationsAtSlot(items, fechaStr, pista, hora) {
  for (const r of items) {
    if (r.fecha !== fechaStr) continue
    const hit = slotsFromReserva(r).some(
      s => Number(s.pista) === Number(pista) && s.hora === hora
    )
    if (hit) return r
  }
  return null
}

export function bloqueoMotivoLaneSlot(bloqueos, fechaStr, pista, hora) {
  for (const b of bloqueos || []) {
    if (Number(b.pista) !== Number(pista)) continue
    if (b.fechaInicio && b.fechaFin) {
      if (fechaStr < b.fechaInicio || fechaStr > b.fechaFin) continue
    } else if (b.fecha && b.fecha !== fechaStr) {
      continue
    }
    const bh = Array.isArray(b.horas) ? b.horas : []
    if (bh.length === 0 || bh.includes(hora))
      return b.motivo || 'Bloqueo administrativo'
  }
  return ''
}

export function clienteNombreReserva(r) {
  return (
    r?.datosPersonales?.nombre ||
    r?.nombre ||
    r?.cliente ||
    'Sin nombre'
  )
}

export function abbrevNombre(nombre, max = 14) {
  const s = String(nombre || '').trim()
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}

/** Agrupa celdas consecutivas iguales en una fila (pista) para colspan. */
export function buildLaneSegments({ pista, horasDia, reservasDia, bloqueos, fechaStr, isLaneFullDayBlocked }) {
  const segments = []
  let current = null

  const pushCurrent = () => {
    if (current) segments.push(current)
    current = null
  }

  for (const hora of horasDia) {
    let cell
    if (isLaneFullDayBlocked?.(pista, fechaStr)) {
      cell = { type: 'bloqueo', key: `fd-${pista}`, label: 'Bloqueo día', motivo: 'Pista bloqueada todo el día' }
    } else {
      const motivo = bloqueoMotivoLaneSlot(bloqueos, fechaStr, pista, hora)
      if (motivo) {
        cell = { type: 'bloqueo', key: `blk-${pista}-${motivo}`, label: motivo, motivo }
      } else {
        const r = reservationsAtSlot(reservasDia, fechaStr, pista, hora)
        if (r) {
          cell = {
            type: 'reserva',
            key: `res-${r.reference || r.id}-${r.estado}`,
            reserva: r,
            label: abbrevNombre(clienteNombreReserva(r)),
          }
        } else {
          cell = { type: 'libre', key: 'libre' }
        }
      }
    }

    if (current && current.type === cell.type && current.key === cell.key) {
      current.span += 1
      current.horas.push(hora)
      continue
    }
    pushCurrent()
    current = { ...cell, span: 1, horaStart: hora, horas: [hora] }
  }
  pushCurrent()
  return segments
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function nextMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? 1 : day === 1 ? 0 : 8 - day
  d.setDate(d.getDate() + diff)
  return d
}

function getEasterDate(year) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month, day)
}

function getColombianHolidays(year) {
  const easter = getEasterDate(year)
  return [
    new Date(year, 0, 1),
    nextMonday(new Date(year, 0, 6)),
    nextMonday(new Date(year, 2, 19)),
    addDays(easter, -3),
    addDays(easter, -2),
    new Date(year, 4, 1),
    nextMonday(addDays(easter, 39)),
    nextMonday(addDays(easter, 60)),
    nextMonday(addDays(easter, 68)),
    nextMonday(new Date(year, 5, 29)),
    new Date(year, 6, 20),
    new Date(year, 7, 7),
    nextMonday(new Date(year, 7, 15)),
    nextMonday(new Date(year, 9, 12)),
    nextMonday(new Date(year, 10, 1)),
    nextMonday(new Date(year, 10, 11)),
    new Date(year, 11, 8),
    new Date(year, 11, 25),
  ]
}

export function buildHolidaysSet(years) {
  const set = new Set()
  for (const y of years) {
    for (const d of getColombianHolidays(y)) {
      set.add(toDateStr(d))
    }
  }
  return set
}

export function reservasDiaOrdenadas(reservasDia) {
  const seen = new Set()
  const list = []
  for (const r of reservasDia) {
    const ref = r.reference || r.id
    if (ref && seen.has(ref)) continue
    if (ref) seen.add(ref)
    list.push(r)
  }
  return list.sort((a, b) => {
    const sa = slotsFromReserva(a)[0]?.hora || ''
    const sb = slotsFromReserva(b)[0]?.hora || ''
    const ia = ALL_HOUR_SLOTS.indexOf(sa)
    const ib = ALL_HOUR_SLOTS.indexOf(sb)
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
  })
}
