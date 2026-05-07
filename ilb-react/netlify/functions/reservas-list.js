import { getReservasCollection } from './lib/db.js'

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const requestedLimit = Number.parseInt(String(event.queryStringParameters?.limit || ''), 10)
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 5000)
      : 1000
    const reservas = await getReservasCollection()
    const docs = await reservas
      .find({})
      .sort({ creadaEn: -1 })
      .limit(limit)
      .toArray()

    const list = docs.map(d => ({
      reference: d.reference,
      estado: d.estado,
      origen: d.origen || (String(d.reference || '').startsWith('MANUAL-') ? 'manual' : null),
      fecha: d.fecha,
      pistas: d.pistas,
      horas: d.horas,
      personas: d.personas,
      extras: d.extras,
      total: d.total,
      description: d.description,
      datosPersonales: d.datosPersonales,
      metodoPago: d.metodoPago || '',
      notas: d.notas || '',
      motivoPendiente: d.estado === 'pendiente' ? (d.placetopay?.statusMessage || '') : '',
      creadaEn: d.creadaEn,
      actualizadaEn: d.actualizadaEn,
    }))

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservas: list }),
    }
  } catch (err) {
    console.error('[Reservas] List error:', err.message)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    }
  }
}
