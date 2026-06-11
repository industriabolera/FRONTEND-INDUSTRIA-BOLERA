import { randomUUID } from 'crypto'
import { getBloqueosCollection, getReservasCollection } from './lib/db.js'
import { requireAuth } from './lib/admin-auth.js'
import { bloqueoConflictoConReservas, bloqueoConflictoConOtrosAdmin } from './lib/reserva-availability.js'

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

function mapDocPublic(d) {
  if (!d) return null
  return {
    id: d.id,
    pista: d.pista,
    fechaInicio: d.fechaInicio,
    fechaFin: d.fechaFin,
    horas: Array.isArray(d.horas) ? d.horas : [],
    fecha: d.fecha || undefined,
  }
}

function mapDoc(d) {
  if (!d) return null
  return {
    ...mapDocPublic(d),
    motivo: d.motivo || '',
    metodoPago: d.metodoPago || '',
    comentarios: d.comentarios || '',
    personas: typeof d.personas === 'number' ? d.personas : (d.personas ? Number(d.personas) : undefined),
    creadaEn: d.creadaEn,
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Content-Type': 'application/json' } }
  }

  try {
    const col = await getBloqueosCollection()

    if (event.httpMethod === 'GET') {
      const docs = await col.find({}).sort({ fechaInicio: 1, pista: 1 }).toArray()
      const auth = requireAuth(event, ['pistas:read'])
      const mapper = auth.ok ? mapDoc : mapDocPublic
      return json(200, { bloqueos: docs.map(mapper).filter(Boolean) })
    }

    if (event.httpMethod === 'POST') {
      const auth = requireAuth(event, ['pistas:write'])
      if (!auth.ok) return json(auth.statusCode, { error: auth.error })

      let body
      try {
        body = JSON.parse(event.body || '{}')
      } catch {
        return json(400, { error: 'JSON inválido' })
      }

      const pista = Number(body.pista)
      const { fechaInicio, fechaFin, motivo = '' } = body
      const horas = Array.isArray(body.horas) ? body.horas : []
      const metodoPago = body.metodoPago ? String(body.metodoPago) : ''
      const comentarios = body.comentarios ? String(body.comentarios) : ''
      const personas = body.personas !== undefined && body.personas !== null && body.personas !== ''
        ? Number(body.personas)
        : undefined

      if (!Number.isInteger(pista) || pista < 1 || !fechaInicio || !fechaFin) {
        return json(400, { error: 'pista, fechaInicio y fechaFin son requeridos' })
      }
      if (personas !== undefined && (!Number.isFinite(personas) || personas < 1 || personas > 60)) {
        return json(400, { error: 'personas debe ser un número entre 1 y 60' })
      }

      const reservasCol = await getReservasCollection()
      const conflicto = await bloqueoConflictoConReservas(
        { pista, fechaInicio, fechaFin, horas },
        reservasCol
      )
      if (conflicto) return json(409, { error: conflicto })

      const conflictoOtros = await bloqueoConflictoConOtrosAdmin(col, {
        pista,
        fechaInicio,
        fechaFin,
        horas,
      })
      if (conflictoOtros) return json(409, { error: conflictoOtros })

      const id = typeof body.id === 'string' && body.id ? body.id : randomUUID()
      const doc = {
        id,
        pista,
        fechaInicio,
        fechaFin,
        horas,
        motivo: String(motivo),
        metodoPago,
        comentarios,
        ...(personas !== undefined ? { personas } : {}),
        creadaEn: new Date(),
      }
      if (body.fecha) doc.fecha = body.fecha

      await col.insertOne(doc)
      return json(201, { bloqueo: mapDoc(doc) })
    }

    if (event.httpMethod === 'DELETE') {
      const auth = requireAuth(event, ['pistas:write'])
      if (!auth.ok) return json(auth.statusCode, { error: auth.error })

      let body
      try {
        body = JSON.parse(event.body || '{}')
      } catch {
        return json(400, { error: 'JSON inválido' })
      }
      const { id } = body
      if (!id || typeof id !== 'string') {
        return json(400, { error: 'id es requerido' })
      }
      const result = await col.deleteOne({ id })
      return json(200, { deleted: result.deletedCount })
    }

    return json(405, { error: 'Method not allowed' })
  } catch (err) {
    console.error('[Bloqueos]', err.message)
    return json(500, { error: err.message })
  }
}
