import { getReservasCollection } from './lib/db.js'

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const reservas = await getReservasCollection()
    const docs = await reservas
      .find({})
      .sort({ creadaEn: -1 })
      .limit(200)
      .toArray()

    const list = docs.map(d => ({
      reference: d.reference,
      estado: d.estado,
      fecha: d.fecha,
      pistas: d.pistas,
      horas: d.horas,
      personas: d.personas,
      extras: d.extras,
      total: d.total,
      description: d.description,
      datosPersonales: d.datosPersonales,
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
