import { getReservasCollection } from './lib/db.js'
import { querySession } from './lib/placetopay.js'
import { resolveSessionEstado } from './lib/placetopay-status.js'
import { paymentAccessAllowed } from './lib/payment-access-token.js'
import { apiErrorMessage, checkRateLimit, getClientIp, jsonResponse } from './lib/http-security.js'

const POST_METHODS = 'POST, OPTIONS'

function publicReservaView(reserva) {
  if (!reserva) return null
  return {
    reference: reserva.reference,
    fecha: reserva.fecha,
    pistas: reserva.pistas,
    horas: reserva.horas,
    personas: reserva.personas,
    extras: reserva.extras,
    total: reserva.total,
    description: reserva.description,
    datosPersonales: reserva.datosPersonales,
    creadaEn: reserva.creadaEn,
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(204, {}, event, POST_METHODS)
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, event, POST_METHODS)
  }

  try {
    const ip = getClientIp(event)
    if (!checkRateLimit(`pay-verify:${ip}`, { max: 120, windowMs: 60 * 60 * 1000 })) {
      return jsonResponse(429, { error: 'Demasiados intentos. Intenta más tarde.' }, event, POST_METHODS)
    }

    const { requestId, accessToken } = JSON.parse(event.body || '{}')
    if (!requestId) {
      return jsonResponse(400, { error: 'requestId is required' }, event, POST_METHODS)
    }

    const reservas = await getReservasCollection()
    const existing = await reservas.findOne({ requestId: String(requestId) })
    if (!existing) {
      return jsonResponse(404, { error: 'Reserva no encontrada' }, event, POST_METHODS)
    }

    if (!paymentAccessAllowed(existing, accessToken)) {
      return jsonResponse(403, { error: 'No autorizado para consultar esta reserva' }, event, POST_METHODS)
    }

    const result = await querySession(requestId)
    const { estado, sessionStatus, statusMessage } = resolveSessionEstado(result)

    const reserva = await reservas.findOneAndUpdate(
      { requestId: String(requestId) },
      { $set: { estado, 'placetopay.status': sessionStatus, 'placetopay.statusMessage': statusMessage, actualizadaEn: new Date() } },
      { returnDocument: 'after' }
    )

    return jsonResponse(200, {
      requestId: result.requestId,
      estado,
      status: result.status,
      reserva: publicReservaView(reserva),
    }, event, POST_METHODS)
  } catch (err) {
    console.error('[Payment] Verify error:', err.message)
    return jsonResponse(500, { error: apiErrorMessage(err) }, event, POST_METHODS)
  }
}
