import { getReservasCollection } from './lib/db.js'

function parseSlots(reserva) {
  const slots = []
  const fecha = reserva.fecha
  const horas = reserva.horas || ''

  // Format: "P5:2:00 PM,3:00 PM|P6:2:00 PM"
  horas.split('|').forEach(pistaBlock => {
    const match = pistaBlock.match(/^P(\d+):(.+)$/)
    if (match) {
      const pista = parseInt(match[1], 10)
      match[2].split(',').forEach(h => {
        slots.push({ pista, fecha, hora: h.trim() })
      })
    }
  })

  return slots
}

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const reservas = await getReservasCollection()
    const confirmed = await reservas
      .find({ estado: 'exitosa' })
      .project({ fecha: 1, pistas: 1, horas: 1 })
      .toArray()

    const slots = confirmed.flatMap(parseSlots)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slots }),
    }
  } catch (err) {
    console.error('[Reservas] Slots error:', err.message)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    }
  }
}
