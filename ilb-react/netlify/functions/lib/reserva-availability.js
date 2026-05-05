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

/** Rangos inclusivos tipo YYYY-MM-DD (orden lexicográfico válido siempre que sean esa forma). */
export function rangosFechaYmdSeSolapan(fi1, ff1, fi2, ff2) {
  if (!fi1 || !ff1 || !fi2 || !ff2) return false
  return !(ff1 < fi2 || ff2 < fi1)
}

function rangoNormalizadoBloqueo(bloqueo) {
  if (bloqueo.fechaInicio && bloqueo.fechaFin) {
    return { fi: bloqueo.fechaInicio, ff: bloqueo.fechaFin }
  }
  const f = bloqueo.fecha
  return { fi: f || '', ff: f || '' }
}

/**
 * Misma pista: si los rangos de fechas se solapan, hay conflicto si ambos cubren cualquier mismo slot.
 * Día completo (`horas` vacío) choca con cualquier bloqueo que solape el rango.
 */
export function bloqueoAdminConflictua(existente, nuevaFechaInicio, nuevaFechaFin, nuevasHoras) {
  const { fi: efi, ff: eff } = rangoNormalizadoBloqueo(existente)
  if (!rangosFechaYmdSeSolapan(efi, eff, nuevaFechaInicio, nuevaFechaFin)) return false
  const hex = Array.isArray(existente.horas) ? existente.horas : []
  const hn = Array.isArray(nuevasHoras) ? nuevasHoras : []
  const exTodoDia = hex.length === 0
  const nuTodoDia = hn.length === 0
  if (exTodoDia || nuTodoDia) return true
  const setEx = new Set(hex)
  return hn.some(h => setEx.has(h))
}

/** @returns {Promise<string|null>} mensaje si ya existe otro bloqueo que cubre ese horario */
export async function bloqueoConflictoConOtrosAdmin(bloqueosCol, opts) {
  const { omitId, pista, fechaInicio, fechaFin, horas } = opts
  const hh = Array.isArray(horas) ? horas : []
  const docs = await bloqueosCol
    .find({ pista: Number(pista) })
    .project({ id: 1, fechaInicio: 1, fechaFin: 1, fecha: 1, horas: 1 })
    .toArray()
  for (const ex of docs) {
    if (omitId && ex.id === omitId) continue
    if (!bloqueoAdminConflictua(ex, fechaInicio, fechaFin, hh)) continue
    const { fi: rfi, ff: rff } = rangoNormalizadoBloqueo(ex)
    const rango = rfi === rff ? rfi : `${rfi} → ${rff}`
    return (
      `Ya existe un bloqueo que coincide con ese horario en la pista ${pista} (` +
      `rango ${rango}${Array.isArray(ex.horas) && ex.horas.length > 0 ? `, horas ${ex.horas.join(', ')}` : ', todo el día'}). `
      + `Ajusta las fechas, las horas o elimina el bloqueo anterior.`
    )
  }
  return null
}

export async function isSlotBlockedOrReserved({ pista, fecha, hora }, { reservasCol, bloqueosCol }) {
  const bloqueos = await bloqueosCol
    .find({
      pista: Number(pista),
      $or: [
        { fechaInicio: { $lte: fecha }, fechaFin: { $gte: fecha } },
        { fecha },
      ],
    })
    .project({ horas: 1 })
    .toArray()

  for (const bloqueo of bloqueos) {
    const bh = Array.isArray(bloqueo.horas) ? bloqueo.horas : []
    if (bh.length === 0 || bh.includes(hora)) return true
  }

  return isSlotReservedByConfirmedOrPendingHold({ pista, fecha, hora }, reservasCol)
}

/** Varias parejas { pista, hora } únicas para una reserva manual (sin duplicados). */
export function normalizeAdminManualSlots(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const out = []
  for (const s of raw) {
    const pista = Number(s?.pista)
    const hora = String(s?.hora || '').trim()
    if (!Number.isInteger(pista) || pista < 1 || pista > 11 || !hora) continue
    const key = `${pista}\0${hora}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ pista, hora })
  }
  out.sort((a, b) => (a.pista !== b.pista ? a.pista - b.pista : String(a.hora).localeCompare(String(b.hora), 'es')))
  return out
}

/** Formato igual que checkout: P5:12:00 PM,1:00 PM|P7:12:00 PM */
export function buildHorasPipeString(slotsNormalized) {
  const byPista = new Map()
  for (const { pista, hora } of slotsNormalized) {
    if (!byPista.has(pista)) byPista.set(pista, new Set())
    byPista.get(pista).add(hora)
  }
  const parts = []
  for (const p of [...byPista.keys()].sort((a, b) => a - b)) {
    const horas = [...byPista.get(p)].sort((a, b) => String(a).localeCompare(String(b), 'es'))
    parts.push(`P${p}:${horas.join(',')}`)
  }
  return parts.join('|')
}
