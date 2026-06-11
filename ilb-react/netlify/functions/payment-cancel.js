import { getReservasCollection } from './lib/db.js'
import { paymentAccessAllowed } from './lib/payment-access-token.js'
import { apiErrorMessage, checkRateLimit, getClientIp, jsonResponse } from './lib/http-security.js'

const POST_METHODS = 'POST, OPTIONS'

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(204, {}, event, POST_METHODS)
  }

  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, event, POST_METHODS)

  try {
    const ip = getClientIp(event)
    if (!checkRateLimit(`pay-cancel:${ip}`, { max: 60, windowMs: 60 * 60 * 1000 })) {
      return jsonResponse(429, { error: 'Demasiados intentos. Intenta más tarde.' }, event, POST_METHODS)
    }

    const body = JSON.parse(event.body || '{}')
    const reference = String(body.reference || '').trim()
    const requestId = body.requestId ? String(body.requestId).trim() : ''
    const accessToken = body.accessToken ? String(body.accessToken) : ''
    if (!reference && !requestId) return jsonResponse(400, { error: 'reference o requestId es requerido' }, event, POST_METHODS)

    const reservas = await getReservasCollection()
    const filter = reference ? { reference } : { requestId }
    const existing = await reservas.findOne(filter)
    if (!existing) return jsonResponse(404, { error: 'Reserva no encontrada' }, event, POST_METHODS)

    if (!paymentAccessAllowed(existing, accessToken)) {
      return jsonResponse(403, { error: 'No autorizado para cancelar esta reserva' }, event, POST_METHODS)
    }

    const result = await reservas.updateOne(
      { ...filter, estado: { $in: ['pendiente'] } },
      {
        $set: {
          estado: 'cancelada',
          'placetopay.status': 'CANCELLED',
          'placetopay.statusMessage': body.reason ? String(body.reason) : 'Cancelada por el usuario',
          canceladaPorUsuario: true,
          actualizadaEn: new Date(),
        },
      }
    )

    return jsonResponse(200, { updated: result.modifiedCount }, event, POST_METHODS)
  } catch (err) {
    console.error('[PaymentCancel]', err.message)
    return jsonResponse(500, { error: apiErrorMessage(err) }, event, POST_METHODS)
  }
}
