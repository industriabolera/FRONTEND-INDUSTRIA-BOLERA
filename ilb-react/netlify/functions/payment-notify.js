import { createHash } from 'crypto'
import { getReservasCollection } from './lib/db.js'
import { querySession } from './lib/placetopay.js'
import { resolveSessionEstado } from './lib/placetopay-status.js'
import { isProductionEnv, apiErrorMessage, jsonResponse } from './lib/http-security.js'

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

    let verifiedNotificationStatus

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

      verifiedNotificationStatus = statusValue
      console.log(`[Webhook] Signature verified OK for requestId=${requestId}`)
    } else if (isProductionEnv()) {
      console.warn(`[Webhook] No signature provided for requestId=${requestId}`)
      return jsonResponse(401, { error: 'Invalid signature' }, event, 'POST, OPTIONS')
    } else {
      console.warn(`[Webhook] No signature provided for requestId=${requestId} — proceeding in non-production`)
    }

    // Consultar estado actualizado en PlaceToPay para confirmar
    const result = await querySession(requestId)
    const { estado, sessionStatus, statusMessage } = resolveSessionEstado(result, {
      notificationStatus: verifiedNotificationStatus,
    })

    const reservas = await getReservasCollection()
    await reservas.updateOne(
      { requestId: String(requestId) },
      {
        $set: {
          estado,
          'placetopay.status': sessionStatus,
          'placetopay.statusMessage': statusMessage,
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
    return jsonResponse(500, { error: apiErrorMessage(err) }, event, 'POST, OPTIONS')
  }
}
