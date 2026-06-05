import { getReservasCollection, getBloqueosCollection } from './lib/db.js'
import { requireAuth } from './lib/admin-auth.js'
import { reprogramarReservaAdmin } from './lib/admin-reserva-reprogramar-shared.js'
import { mapReservaDocToListRow } from './lib/reservas-list-shared.js'

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { 'Content-Type': 'application/json' } }

  const auth = requireAuth(event, ['reservas:write'])
  if (!auth.ok) return json(auth.statusCode, { error: auth.error })

  try {
    const reservas = await getReservasCollection()

    if (event.httpMethod === 'PATCH') {
      const body = JSON.parse(event.body || '{}')
      const reference = String(body.reference || '').trim()
      const action = String(body.action || '').trim()
      if (!reference) return json(400, { error: 'reference es requerido' })

      if (action === 'inactivar') {
        const result = await reservas.findOneAndUpdate(
          { reference },
          {
            $set: {
              estado: 'cancelada',
              adminOverride: true,
              adminOverrideReason: body.reason ? String(body.reason) : 'Inactivada por admin',
              actualizadaEn: new Date(),
            },
          },
          { returnDocument: 'after' }
        )
        return json(200, { reserva: result })
      }

      if (action === 'reprogramar') {
        const bloqueos = await getBloqueosCollection()
        const outcome = await reprogramarReservaAdmin({
          reservasCol: reservas,
          bloqueosCol: bloqueos,
          reference,
          fecha: body.fecha,
          slots: body.slots,
          username: auth.user?.username,
        })
        if (!outcome.ok) return json(outcome.status, { error: outcome.error })
        return json(200, { reserva: mapReservaDocToListRow(outcome.reserva) })
      }

      return json(400, { error: 'action inválida' })
    }

    if (event.httpMethod === 'DELETE') {
      const body = JSON.parse(event.body || '{}')
      const reference = String(body.reference || '').trim()
      if (!reference) return json(400, { error: 'reference es requerido' })
      const result = await reservas.deleteOne({ reference })
      return json(200, { deleted: result.deletedCount })
    }

    return json(405, { error: 'Method not allowed' })
  } catch (err) {
    console.error('[AdminReservas]', err.message)
    return json(500, { error: err.message })
  }
}

