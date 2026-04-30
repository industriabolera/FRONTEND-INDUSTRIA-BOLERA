import { getReservasCollection, getBloqueosCollection } from './lib/db.js'
import { createSession } from './lib/placetopay.js'

function parseSlots(fecha, horasStr) {
  const slots = []
  if (!fecha || !horasStr) return slots
  horasStr.split('|').forEach(block => {
    const m = block.match(/^P(\d+):(.+)$/)
    if (!m) return
    const pista = parseInt(m[1], 10)
    m[2].split(',').forEach(h => {
      const hora = h.trim()
      if (hora) slots.push({ pista, fecha, hora })
    })
  })
  return slots
}

async function isSlotBlockedOrReserved({ pista, fecha, hora }, { reservasCol, bloqueosCol }) {
  // Bloqueos (todo el día o por hora)
  const bloqueo = await bloqueosCol.findOne({
    pista: Number(pista),
    $or: [
      // rango
      { fechaInicio: { $lte: fecha }, fechaFin: { $gte: fecha } },
      // legacy single day
      { fecha },
    ],
  })
  if (bloqueo) {
    const horas = Array.isArray(bloqueo.horas) ? bloqueo.horas : []
    if (horas.length === 0 || horas.includes(hora)) return true
  }

  // Reservas online confirmadas o pendientes recientes
  const holdSince = new Date(Date.now() - 30 * 60 * 1000)
  const candidates = await reservasCol.find({
    fecha,
    $or: [
      { estado: 'exitosa' },
      { estado: 'pendiente', actualizadaEn: { $gte: holdSince } },
    ],
  }).project({ horas: 1 }).toArray()

  for (const r of candidates) {
    const slots = parseSlots(fecha, r.horas || '')
    if (slots.some(s => s.pista === Number(pista) && s.hora === hora)) return true
  }

  return false
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST' } }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const body = JSON.parse(event.body)
    const { reference, description, total, pista, fecha, hora, personas, extras, datosPersonales } = body

    if (!reference || !total || !description) {
      return { statusCode: 400, body: JSON.stringify({ error: 'reference, total y description son requeridos' }) }
    }

    if (!datosPersonales?.nombre || !datosPersonales?.telefono || !datosPersonales?.correo || !datosPersonales?.documento) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Datos personales son requeridos (nombre, teléfono, correo, documento)' }) }
    }

    // Validar nombre: solo letras, tildes, ñ, espacios, guiones
    const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/
    if (!namePattern.test(datosPersonales.nombre.trim())) {
      return { statusCode: 400, body: JSON.stringify({ error: 'El nombre solo puede contener letras, tildes, ñ, espacios y guiones' }) }
    }

    // ── Anti-duplicado: verificar si ya existe una sesión pendiente reciente ──
    const reservas = await getReservasCollection()
    const recentDuplicate = await reservas.findOne({
      reference,
      estado: 'pendiente',
      creadaEn: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
    })
    if (recentDuplicate) {
      console.log(`[Payment] Duplicate blocked: ref=${reference} (existing requestId=${recentDuplicate.requestId})`)
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: recentDuplicate.requestId,
          processUrl: recentDuplicate.placetopay?.processUrl,
          status: { status: 'OK', message: 'Session already exists' },
        }),
      }
    }

    // Validar disponibilidad (bloqueos + reservas existentes) ANTES de crear sesión de pago
    const slotsToCheck = parseSlots(fecha, hora)
    const bloqueos = await getBloqueosCollection()
    for (const s of slotsToCheck) {
      // eslint-disable-next-line no-await-in-loop
      const taken = await isSlotBlockedOrReserved(s, { reservasCol: reservas, bloqueosCol: bloqueos })
      if (taken) {
        return {
          statusCode: 409,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: `La pista ${s.pista} a las ${s.hora} ya no está disponible.` }),
        }
      }
    }

    const baseUrl = process.env.URL || process.env.FRONTEND_URL || 'http://localhost:8888'

    const result = await createSession({
      reference,
      description,
      total,
      currency: 'COP',
      returnUrl: `${baseUrl}/reservas?ref=${encodeURIComponent(reference)}&requestId={requestId}`,
      cancelUrl: `${baseUrl}/reservas?ref=${encodeURIComponent(reference)}&status=cancelled`,
      ipAddress: event.headers['x-forwarded-for']?.split(',')[0]?.trim() || '127.0.0.1',
      userAgent: event.headers['user-agent'] || 'ILB Reservas',
      buyer: {
        name: datosPersonales.nombre.split(' ')[0],
        surname: datosPersonales.nombre.split(' ').slice(1).join(' ') || datosPersonales.nombre.split(' ')[0],
        email: datosPersonales.correo,
        mobile: datosPersonales.telefono,
        document: datosPersonales.documento,
        documentType: datosPersonales.tipoDocumento,
      },
      fields: [
        { keyword: 'pista', value: String(pista), displayOn: 'both' },
        { keyword: 'fecha', value: fecha, displayOn: 'both' },
        { keyword: 'hora', value: hora, displayOn: 'both' },
        { keyword: 'personas', value: String(personas), displayOn: 'both' },
        { keyword: 'extras', value: extras || '', displayOn: 'both' },
      ],
    })

    await reservas.insertOne({
      reference,
      requestId: String(result.requestId),
      estado: 'pendiente',
      fecha,
      pistas: pista,
      horas: hora,
      personas: Number(personas),
      extras: extras || '',
      total: Number(total),
      description,
      datosPersonales: {
        nombre: datosPersonales.nombre,
        telefono: datosPersonales.telefono,
        correo: datosPersonales.correo,
        tipoDocumento: datosPersonales.tipoDocumento,
        documento: datosPersonales.documento,
        fechaNacimiento: datosPersonales.fechaNacimiento,
      },
      placetopay: {
        requestId: result.requestId,
        processUrl: result.processUrl,
        statusMessage: result.status?.message,
      },
      creadaEn: new Date(),
      actualizadaEn: new Date(),
    })

    console.log(`[Payment] Created: ref=${reference} requestId=${result.requestId} estado=pendiente`)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: result.requestId,
        processUrl: result.processUrl,
        status: result.status,
      }),
    }
  } catch (err) {
    console.error('[Payment] Create error:', err.message)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    }
  }
}
