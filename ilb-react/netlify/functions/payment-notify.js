import { createHash } from 'crypto'
import { getReservasCollection } from './lib/db.js'
import { querySession } from './lib/placetopay.js'

function mapStatus(paymentStatus) {
  if (paymentStatus === 'APPROVED') return 'exitosa'
  if (paymentStatus === 'REJECTED') return 'rechazada'
  if (paymentStatus === 'CANCELLED') return 'cancelada'
  return 'pendiente'
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST' } }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { status, requestId, reference, signature } = JSON.parse(event.body)

    if (!requestId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'requestId is required' }) }
    }

    // ── Validar firma del webhook ──
    // Firma: SHA-256(requestId + status.status + status.date + secretKey)
    // Ref: https://docs.placetopay.dev/checkout/notification
    if (signature) {
      const secretKey = process.env.PLACETOPAY_TRANKEY
      const statusValue = status?.status || ''
      const dateValue = status?.date || ''

      const expectedSignature = createHash('sha256')
        .update(String(requestId) + statusValue + dateValue + secretKey)
        .digest('hex')

      const receivedSignature = signature.startsWith('sha256:')
        ? signature.slice(7)
        : signature

      if (receivedSignature !== expectedSignature) {
        console.warn(`[Webhook] Invalid signature for requestId=${requestId}`)
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Invalid signature' }),
        }
      }

      console.log(`[Webhook] Signature verified OK for requestId=${requestId}`)
    } else {
      console.warn(`[Webhook] No signature provided for requestId=${requestId} — proceeding with query verification`)
    }

    // Consultar estado actualizado en PlaceToPay para confirmar
    const result = await querySession(requestId)
    const paymentStatus = result.status?.status
    const estado = mapStatus(paymentStatus)

    const reservas = await getReservasCollection()
    await reservas.updateOne(
      { requestId: String(requestId) },
      {
        $set: {
          estado,
          'placetopay.status': paymentStatus,
          'placetopay.statusMessage': result.status?.message,
          actualizadaEn: new Date(),
          notifiedByWebhook: true,
        },
      }
    )

    console.log(`[Webhook] ${estado.toUpperCase()} — ref=${reference} requestId=${requestId}`)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ok' }),
    }
  } catch (err) {
    console.error('[Webhook] Error:', err.message)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    }
  }
}
