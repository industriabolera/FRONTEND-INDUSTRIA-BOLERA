import { validateFechaHorariosReservaColombia } from './booking-datetime-colombia.js'
import {
  normalizeAdminManualSlots,
  buildHorasPipeString,
  isSlotBlockedOrReservedExcluding,
} from './reserva-availability.js'

const ESTADOS_MODIFICABLES = new Set(['exitosa', 'pendiente'])

/**
 * @param {object} params
 * @param {import('mongodb').Collection} params.reservasCol
 * @param {import('mongodb').Collection} params.bloqueosCol
 * @param {string} params.reference
 * @param {string} params.fecha YYYY-MM-DD
 * @param {Array<{ pista: number, hora: string }>} params.slots
 * @param {string} [params.username]
 * @returns {Promise<{ ok: true, reserva: object } | { ok: false, status: number, error: string }>}
 */
export async function reprogramarReservaAdmin({
  reservasCol,
  bloqueosCol,
  reference,
  fecha,
  slots,
  username,
}) {
  const ref = String(reference || '').trim()
  const fechaNueva = String(fecha || '').trim()

  if (!ref) return { ok: false, status: 400, error: 'reference es requerido' }
  if (!fechaNueva) return { ok: false, status: 400, error: 'fecha es requerida' }

  const existing = await reservasCol.findOne({ reference: ref })
  if (!existing) return { ok: false, status: 404, error: 'Reserva no encontrada' }

  const estado = String(existing.estado || '')
  if (estado === 'cancelada' || estado === 'rechazada') {
    return { ok: false, status: 400, error: 'No se puede modificar una reserva cancelada o rechazada' }
  }
  if (!ESTADOS_MODIFICABLES.has(estado)) {
    return { ok: false, status: 400, error: `No se puede modificar una reserva en estado "${estado}"` }
  }

  const slotsNormalized = normalizeAdminManualSlots(slots)
  if (slotsNormalized.length === 0) {
    return { ok: false, status: 400, error: 'Incluye al menos una pista con hora válida' }
  }

  const horasUnicas = [...new Set(slotsNormalized.map(s => s.hora))]
  const fechaHoraErr = validateFechaHorariosReservaColombia(fechaNueva, horasUnicas)
  if (fechaHoraErr) return { ok: false, status: 400, error: fechaHoraErr }

  for (const s of slotsNormalized) {
    const taken = await isSlotBlockedOrReservedExcluding(
      { pista: s.pista, fecha: fechaNueva, hora: s.hora, excludeReference: ref },
      { reservasCol, bloqueosCol }
    )
    if (taken) {
      return {
        ok: false,
        status: 409,
        error: `La pista ${s.pista} no está disponible el ${fechaNueva} a las ${s.hora} (reservada o bloqueada).`,
      }
    }
  }

  const horasStr = buildHorasPipeString(slotsNormalized)
  const pistasNums = [...new Set(slotsNormalized.map(s => s.pista))].sort((a, b) => a - b)
  const pistasCampo = pistasNums.join(', ')
  const now = new Date()

  const result = await reservasCol.findOneAndUpdate(
    { reference: ref },
    {
      $set: {
        fecha: fechaNueva,
        horas: horasStr,
        pistas: pistasCampo,
        actualizadaEn: now,
        adminReprogramadaEn: now,
        adminReprogramadaPor: username || 'admin',
        adminReprogramacionAnterior: {
          fecha: existing.fecha || '',
          horas: existing.horas || '',
          pistas: existing.pistas || '',
        },
      },
    },
    { returnDocument: 'after' }
  )

  if (!result) return { ok: false, status: 500, error: 'No se pudo actualizar la reserva' }

  return { ok: true, reserva: result }
}
