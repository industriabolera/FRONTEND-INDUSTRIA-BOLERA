/**
 * Slots de reserva en formato "P5:2:00 PM,3:00 PM|P6:2:00 PM"
 * (misma convención que payment-create / reservas-slots).
 */
export function parseSlots(fecha, horasStr) {
  const slots = []
  if (!fecha || !horasStr) return slots
  horasStr.split('|').forEach(block => {
    const m = block.match(/^P(\d+):(.+)$/)
    if (!m) return
    const pista = parseInt(m[1], 10)
    m[2].split(',').forEach(h => {
      const hora = h.trim()
      if (hora) slots.push({ pista, fecha, hora })
    })
  })
  return slots
}

export function* eachYmdInRange(fechaInicio, fechaFin) {
  const [y0, m0, d0] = fechaInicio.split('-').map(Number)
  const [y1, m1, d1] = fechaFin.split('-').map(Number)
  const cur = new Date(y0, m0 - 1, d0)
  const endT = new Date(y1, m1 - 1, d1).getTime()
  while (cur.getTime() <= endT) {
    yield `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
    cur.setDate(cur.getDate() + 1)
  }
}

const HOLD_MS = 30 * 60 * 1000

export async function isSlotReservedByConfirmedOrPendingHold({ pista, fecha, hora }, reservasCol) {
  const holdSince = new Date(Date.now() - HOLD_MS)
  const candidates = await reservasCol.find({
    fecha,
    $or: [
      { estado: 'exitosa' },
      { estado: 'pendiente', actualizadaEn: { $gte: holdSince } },
    ],
  }).project({ horas: 1 }).toArray()

  for (const r of candidates) {
    const slots = parseSlots(fecha, r.horas || '')
    if (slots.some(s => s.pista === Number(pista) && s.hora === hora)) return true
  }
  return false
}

export async function hasAnyReservationOnPistaForDate(pista, fecha, reservasCol) {
  const holdSince = new Date(Date.now() - HOLD_MS)
  const candidates = await reservasCol.find({
    fecha,
    $or: [
      { estado: 'exitosa' },
      { estado: 'pendiente', actualizadaEn: { $gte: holdSince } },
    ],
  }).project({ horas: 1 }).toArray()

  for (const r of candidates) {
    const slots = parseSlots(fecha, r.horas || '')
    if (slots.some(s => s.pista === Number(pista))) return true
  }
  return false
}

/**
 * @returns {string|null} Mensaje de error si hay conflicto; null si OK
 */
export async function bloqueoConflictoConReservas({ pista, fechaInicio, fechaFin, horas }, reservasCol) {
  const hh = Array.isArray(horas) ? horas : []
  for (const fecha of eachYmdInRange(fechaInicio, fechaFin)) {
    if (hh.length === 0) {
      if (await hasAnyReservationOnPistaForDate(pista, fecha, reservasCol)) {
        return `La pista ${pista} tiene reservas el ${fecha}. No se puede bloquear el día completo.`
      }
    } else {
      for (const hora of hh) {
        if (await isSlotReservedByConfirmedOrPendingHold({ pista, fecha, hora }, reservasCol)) {
          return `La pista ${pista} a las ${hora} el ${fecha} ya está reservada. Solo puedes bloquear pistas disponibles.`
        }
      }
    }
  }
  return null
}

export async function isSlotBlockedOrReserved({ pista, fecha, hora }, { reservasCol, bloqueosCol }) {
  const bloqueo = await bloqueosCol.findOne({
    pista: Number(pista),
    $or: [
      { fechaInicio: { $lte: fecha }, fechaFin: { $gte: fecha } },
      { fecha },
    ],
  })
  if (bloqueo) {
    const bh = Array.isArray(bloqueo.horas) ? bloqueo.horas : []
    if (bh.length === 0 || bh.includes(hora)) return true
  }

  return isSlotReservedByConfirmedOrPendingHold({ pista, fecha, hora }, reservasCol)
}
