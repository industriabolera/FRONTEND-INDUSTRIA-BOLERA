import { randomUUID } from 'crypto'
import { getReservasCollection, getBloqueosCollection } from './lib/db.js'
import { requireAuth } from './lib/admin-auth.js'
import { isSlotBlockedOrReserved } from './lib/reserva-availability.js'
import { validateFechaHorariosReservaColombia } from './lib/booking-datetime-colombia.js'

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Content-Type': 'application/json' } }
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  const auth = requireAuth(event, ['reservas:write'])
  if (!auth.ok) return json(auth.statusCode, { error: auth.error })

  try {
    let body
    try {
      body = JSON.parse(event.body || '{}')
    } catch {
      return json(400, { error: 'JSON inválido' })
    }

    const pista = Number(body.pista)
    const fecha = String(body.fecha || '').trim()
    const hora = String(body.hora || '').trim()
    const nombre = String(body.nombre || '').trim()
    const telefono = String(body.telefono || '').trim()
    const notas = body.notas != null ? String(body.notas) : ''
    const metodoPago = body.metodoPago != null ? String(body.metodoPago) : ''
    const personas = body.personas !== undefined && body.personas !== null && body.personas !== ''
      ? Number(body.personas)
      : 2

    if (!Number.isInteger(pista) || pista < 1 || pista > 11) {
      return json(400, { error: 'pista debe ser un número entre 1 y 11' })
    }
    if (!fecha || !hora) return json(400, { error: 'fecha y hora son requeridos' })
    if (!nombre) return json(400, { error: 'nombre es requerido' })
    if (!Number.isFinite(personas) || personas < 1 || personas > 6) {
      return json(400, { error: 'personas debe ser un número entre 1 y 6' })
    }

    const fechaHoraErr = validateFechaHorariosReservaColombia(fecha, [hora])
    if (fechaHoraErr) return json(400, { error: fechaHoraErr })

    const reservas = await getReservasCollection()
    const bloqueos = await getBloqueosCollection()
    const taken = await isSlotBlockedOrReserved({ pista, fecha, hora }, { reservasCol: reservas, bloqueosCol: bloqueos })
    if (taken) {
      return json(409, { error: 'Esa pista no está disponible en esa fecha y hora (reservada o bloqueada).' })
    }

    const reference = `MANUAL-${randomUUID()}`
    const horasStr = `P${pista}:${hora}`
    const doc = {
      reference,
      estado: 'exitosa',
      origen: 'manual',
      fecha,
      pistas: pista,
      horas: horasStr,
      personas,
      total: 0,
      extras: '',
      description: 'Reserva manual (portal admin)',
      datosPersonales: {
        nombre,
        telefono,
        correo: '',
        tipoDocumento: '',
        documento: '',
      },
      metodoPago,
      notas,
      requestId: `manual-${reference}`,
      creadaEn: new Date(),
      actualizadaEn: new Date(),
      creadaPor: auth.user?.username || 'admin',
    }

    await reservas.insertOne(doc)

    return json(201, {
      reserva: {
        reference,
        estado: doc.estado,
        origen: doc.origen,
        fecha,
        pistas: pista,
        horas: horasStr,
        personas,
      },
    })
  } catch (err) {
    console.error('[AdminReservaManual]', err.message)
    return json(500, { error: err.message })
  }
}
