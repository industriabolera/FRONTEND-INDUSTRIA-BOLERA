import { getReservasCollection } from './lib/db.js'
import { querySession } from './lib/placetopay.js'
import { resolveSessionEstado } from './lib/placetopay-status.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { requestId } = JSON.parse(event.body)

    if (!requestId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'requestId is required' }) }
    }

    const result = await querySession(requestId)
    const { estado, sessionStatus, statusMessage } = resolveSessionEstado(result)

    const reservas = await getReservasCollection()
    const reserva = await reservas.findOneAndUpdate(
      { requestId: String(requestId) },
      { $set: { estado, 'placetopay.status': sessionStatus, 'placetopay.statusMessage': statusMessage, actualizadaEn: new Date() } },
      { returnDocument: 'after' }
    )

    console.log(`[Payment] Verify: requestId=${requestId} estado=${estado}`)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: result.requestId,
        estado,
        status: result.status,
        payment: result.payment,
        reserva: reserva ? {
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
        } : null,
      }),
    }
  } catch (err) {
    console.error('[Payment] Verify error:', err.message)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    }
  }
}
