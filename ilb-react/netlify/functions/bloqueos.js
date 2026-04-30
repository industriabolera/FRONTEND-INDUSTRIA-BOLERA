import { randomUUID } from 'crypto'
import { getBloqueosCollection } from './lib/db.js'

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

function mapDoc(d) {
  if (!d) return null
  return {
    id: d.id,
    pista: d.pista,
    fechaInicio: d.fechaInicio,
    fechaFin: d.fechaFin,
    horas: Array.isArray(d.horas) ? d.horas : [],
    motivo: d.motivo || '',
    fecha: d.fecha || undefined,
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
      return json(200, { bloqueos: docs.map(mapDoc).filter(Boolean) })
    }

    if (event.httpMethod === 'POST') {
      let body
      try {
        body = JSON.parse(event.body || '{}')
      } catch {
        return json(400, { error: 'JSON inválido' })
      }

      const pista = Number(body.pista)
      const { fechaInicio, fechaFin, motivo = '' } = body
      const horas = Array.isArray(body.horas) ? body.horas : []

      if (!Number.isInteger(pista) || pista < 1 || !fechaInicio || !fechaFin) {
        return json(400, { error: 'pista, fechaInicio y fechaFin son requeridos' })
      }

      const id = typeof body.id === 'string' && body.id ? body.id : randomUUID()
      const doc = {
        id,
        pista,
        fechaInicio,
        fechaFin,
        horas,
        motivo: String(motivo),
        creadaEn: new Date(),
      }
      if (body.fecha) doc.fecha = body.fecha

      await col.insertOne(doc)
      return json(201, { bloqueo: mapDoc(doc) })
    }

    if (event.httpMethod === 'DELETE') {
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
