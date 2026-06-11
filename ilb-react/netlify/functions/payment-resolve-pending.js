/**
 * Scheduled Function: Resolve Pending Payments
 * 
 * Consulta todas las transacciones en estado "pendiente" y verifica su estado
 * final en PlaceToPay para garantizar el estado final en base de datos.
 * 
 * ─── Configuración de ejecución ───
 * Frecuencia: Cada 15 minutos
 * 
 * También puede invocarse manualmente via POST /api/payment/resolve-pending
 */
import { getReservasCollection } from './lib/db.js'
import { querySession } from './lib/placetopay.js'
import { resolveSessionEstado } from './lib/placetopay-status.js'
import { apiErrorMessage, isAuthorizedCron, isProductionEnv, jsonResponse } from './lib/http-security.js'

async function resolvePendingPayments() {
  const reservas = await getReservasCollection()

  const timeoutMinutes = Number(process.env.PENDING_TIMEOUT_MINUTES || 30)
  const timeoutMs = Math.max(5, timeoutMinutes) * 60 * 1000
  const expiredBefore = new Date(Date.now() - timeoutMs)

  // Si una reserva queda "pendiente" demasiado tiempo, la eliminamos para limpiar BD.
  // Por defecto: 2 horas.
  const deleteAfterMinutes = Number(process.env.PENDING_DELETE_AFTER_MINUTES || 120)
  const deleteAfterMs = Math.max(10, deleteAfterMinutes) * 60 * 1000
  const deleteBefore = new Date(Date.now() - deleteAfterMs)

  // Buscar todas las reservas en estado pendiente
  const pendientes = await reservas
    .find({ estado: 'pendiente' })
    .project({ requestId: 1, reference: 1, creadaEn: 1 })
    .toArray()

  console.log(`[CronJob] Found ${pendientes.length} pending reservations to resolve`)

  let resolved = 0
  let deleted = 0
  let errors = 0
  const results = []

  for (const reserva of pendientes) {
    try {
      // Si está pendiente por más de N minutos, eliminarla (limpieza de base de datos)
      if (reserva.creadaEn && new Date(reserva.creadaEn) < deleteBefore) {
        await reservas.deleteOne({ requestId: String(reserva.requestId) })
        deleted++
        results.push({ ref: reserva.reference, requestId: reserva.requestId, from: 'pendiente', to: 'eliminada', reason: 'delete_timeout' })
        console.log(`[CronJob] Deleted stale pending: ref=${reserva.reference} requestId=${reserva.requestId} (>${deleteAfterMinutes} min)`)
        continue
      }

      // Si la sesión está pendiente demasiado tiempo, marcar como cancelada/expirada
      if (reserva.creadaEn && new Date(reserva.creadaEn) < expiredBefore) {
        const result = await querySession(reserva.requestId)
        const { estado, sessionStatus, statusMessage } = resolveSessionEstado(result)

        if (estado !== 'pendiente') {
          await reservas.updateOne(
            { requestId: String(reserva.requestId) },
            {
              $set: {
                estado,
                'placetopay.status': sessionStatus,
                'placetopay.statusMessage': statusMessage,
                actualizadaEn: new Date(),
                resolvedByCron: true,
              },
            }
          )
          resolved++
          results.push({ ref: reserva.reference, requestId: reserva.requestId, from: 'pendiente', to: estado, reason: 'late_approval' })
          console.log(`[CronJob] Late approval: ref=${reserva.reference} requestId=${reserva.requestId} → ${estado}`)
          continue
        }

        await reservas.updateOne(
          { requestId: String(reserva.requestId) },
          {
            $set: {
              estado: 'cancelada',
              'placetopay.status': 'CANCELLED',
              'placetopay.statusMessage': `Expirada por tiempo (${timeoutMinutes} min)`,
              actualizadaEn: new Date(),
              resolvedByCronTimeout: true,
            },
          }
        )
        resolved++
        results.push({ ref: reserva.reference, requestId: reserva.requestId, from: 'pendiente', to: 'cancelada', reason: 'timeout' })
        console.log(`[CronJob] Expired: ref=${reserva.reference} requestId=${reserva.requestId} → cancelada`)
        continue
      }

      const result = await querySession(reserva.requestId)
      const { estado, sessionStatus, statusMessage } = resolveSessionEstado(result)

      if (estado !== 'pendiente') {
        await reservas.updateOne(
          { requestId: String(reserva.requestId) },
          {
            $set: {
              estado,
              'placetopay.status': sessionStatus,
              'placetopay.statusMessage': statusMessage,
              actualizadaEn: new Date(),
              resolvedByCron: true,
            },
          }
        )
        resolved++
        results.push({ ref: reserva.reference, requestId: reserva.requestId, from: 'pendiente', to: estado })
        console.log(`[CronJob] Resolved: ref=${reserva.reference} requestId=${reserva.requestId} → ${estado}`)
      }
    } catch (err) {
      errors++
      console.error(`[CronJob] Error resolving requestId=${reserva.requestId}: ${err.message}`)
    }

    // Pequeña pausa para no saturar la API de PlaceToPay
    await new Promise(r => setTimeout(r, 200))
  }

  const summary = {
    total: pendientes.length,
    resolved,
    deleted,
    stillPending: pendientes.length - resolved - deleted - errors,
    errors,
    results,
    executedAt: new Date().toISOString(),
  }

  console.log(`[CronJob] Summary: ${JSON.stringify(summary)}`)
  return summary
}

// ── Netlify Scheduled Function handler ──
export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(204, {}, event, 'POST, OPTIONS')
  }

  if (event.httpMethod && event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, event, 'POST, OPTIONS')
  }

  const isScheduled = event?.source === 'netlify-scheduled-function'
  if (!isScheduled && isProductionEnv() && !isAuthorizedCron(event)) {
    return jsonResponse(403, { error: 'No autorizado' }, event, 'POST, OPTIONS')
  }

  try {
    const summary = await resolvePendingPayments()
    return jsonResponse(200, summary, event, 'POST, OPTIONS')
  } catch (err) {
    console.error('[CronJob] Fatal error:', err.message)
    return jsonResponse(500, { error: apiErrorMessage(err) }, event, 'POST, OPTIONS')
  }
}
