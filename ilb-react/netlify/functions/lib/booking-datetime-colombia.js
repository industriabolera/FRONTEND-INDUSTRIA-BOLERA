/**
 * Reglas de reserva para CO (Bolera La Industria — America/Bogota, UTC-05 fijo).
 * Usado en payment-create para no aceptar fechas u horarios ya pasados aunque el cliente manipule el body.
 */

export function yyyyMmDdColombia(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** Convierte "10:00 AM" / "2:30 PM" a minutos desde medianoche */
export function slotStrToMinutesSinceMidnight(slotStr) {
  const m = String(slotStr || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!m) return null
  let hh = parseInt(m[1], 10)
  const mm = parseInt(m[2], 10)
  const ap = m[3].toUpperCase()
  if (ap === 'AM') {
    if (hh === 12) hh = 0
  } else if (hh !== 12) {
    hh += 12
  }
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || mm < 0 || mm > 59) return null
  return hh * 60 + mm
}

/** Instante UTC (ms) del inicio del slot en el día fechaStr (YYYY-MM-DD) Bogotá UTC-05 */
export function fechaHoraSlotToMsUtc(fechaStr, slotStr) {
  const mins = slotStrToMinutesSinceMidnight(slotStr)
  if (mins === null) return null
  const [y, mo, d] = fechaStr.split('-').map(Number)
  if (!y || !mo || !d) return null
  const hh = Math.floor(mins / 60)
  const mm = mins % 60
  const iso = `${String(y)}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00-05:00`
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : null
}

/**
 * @param {string} fechaStr YYYY-MM-DD
 * @param {string[]} horaList Lista de etiquetas ("10:00 AM", …), usualmente repetidas por pista
 * @returns {string|null} Mensaje de error o null si OK
 */
export function validateFechaHorariosReservaColombia(fechaStr, horaList) {
  if (!fechaStr || typeof fechaStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    return 'Fecha inválida'
  }

  const hoyCo = yyyyMmDdColombia()
  if (fechaStr.localeCompare(hoyCo) < 0) {
    return 'No puedes reservar para una fecha anterior a hoy.'
  }

  // Días futuros: la UI ya restrige horas; servidor no fuerza grupo de día festivo aquí.
  if (fechaStr.localeCompare(hoyCo) > 0) return null

  const uniq = [...new Set((horaList || []).map(h => String(h).trim()).filter(Boolean))]
  if (uniq.length === 0) return 'Selecciona al menos una hora.'

  const now = Date.now()
  for (const h of uniq) {
    const t = fechaHoraSlotToMsUtc(fechaStr, h)
    if (t === null) continue
    if (now >= t) return 'No puedes reservar horarios que ya comenzaron o pasaron.'
  }

  return null
}
