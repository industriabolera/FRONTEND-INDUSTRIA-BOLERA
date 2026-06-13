import { getReservasCollection } from './lib/db.js'

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST' } }
  }

  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  try {
    const body = JSON.parse(event.body || '{}')
    const reference = String(body.reference || '').trim()
    const requestId = body.requestId ? String(body.requestId).trim() : ''
    if (!reference && !requestId) return json(400, { error: 'reference o requestId es requerido' })

    const reservas = await getReservasCollection()
    const filter = reference ? { reference } : { requestId }

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

    return json(200, { updated: result.modifiedCount })
  } catch (err) {
    console.error('[PaymentCancel]', err.message)
    return json(500, { error: err.message })
  }
}

