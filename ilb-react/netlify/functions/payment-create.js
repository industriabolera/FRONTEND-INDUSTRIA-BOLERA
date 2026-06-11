import { randomUUID } from 'crypto'
import { getReservasCollection, getBloqueosCollection } from './lib/db.js'
import { createSession } from './lib/placetopay.js'
import { validateFechaHorariosReservaColombia } from './lib/booking-datetime-colombia.js'
import { parseSlots, isSlotBlockedOrReserved } from './lib/reserva-availability.js'
import { getOrInitAdminConfig } from './lib/admin-config-shared.js'
import { computeBookingTotal } from './lib/booking-pricing-shared.js'
import { createPaymentAccessToken } from './lib/payment-access-token.js'
import { apiErrorMessage, checkRateLimit, corsHeaders, getClientIp, jsonResponse } from './lib/http-security.js'

const POST_METHODS = 'POST, OPTIONS'

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(204, {}, event, POST_METHODS)
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, event, POST_METHODS)
  }

  try {
    const ip = getClientIp(event)
    if (!checkRateLimit(`pay-create:${ip}`, { max: 30, windowMs: 60 * 60 * 1000 })) {
      return jsonResponse(429, { error: 'Demasiados intentos. Intenta más tarde.' }, event, POST_METHODS)
    }

    const body = JSON.parse(event.body || '{}')
    const { reference, description, total, pista, fecha, hora, personas, extras, datosPersonales } = body

    if (!reference || total == null || !description) {
      return jsonResponse(400, { error: 'reference, total y description son requeridos' }, event, POST_METHODS)
    }

    if (!datosPersonales?.nombre || !datosPersonales?.telefono || !datosPersonales?.correo || !datosPersonales?.documento) {
      return jsonResponse(400, { error: 'Datos personales son requeridos (nombre, teléfono, correo, documento)' }, event, POST_METHODS)
    }

    if (!fecha || !hora) {
      return jsonResponse(400, { error: 'fecha y hora son requeridos' }, event, POST_METHODS)
    }

    const slotsForDate = parseSlots(fecha, hora)
    if (slotsForDate.length === 0) {
      return jsonResponse(400, { error: 'Datos de pista / horario inválidos' }, event, POST_METHODS)
    }

    const fechaHoraErr = validateFechaHorariosReservaColombia(
      fecha,
      slotsForDate.map(s => s.hora)
    )
    if (fechaHoraErr) {
      return jsonResponse(400, { error: fechaHoraErr }, event, POST_METHODS)
    }

    const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/
    if (!namePattern.test(String(datosPersonales.nombre).trim())) {
      return jsonResponse(400, { error: 'El nombre solo puede contener letras, tildes, ñ, espacios y guiones' }, event, POST_METHODS)
    }

    const config = await getOrInitAdminConfig()
    const pricing = computeBookingTotal({ config, fecha, hora, personas, extras })
    if (!pricing.ok) {
      return jsonResponse(400, { error: pricing.error }, event, POST_METHODS)
    }
    if (Number(total) !== pricing.total) {
      return jsonResponse(400, { error: 'El total no coincide con el precio calculado. Recarga la página e intenta de nuevo.' }, event, POST_METHODS)
    }

    const reservas = await getReservasCollection()
    const recentDuplicate = await reservas.findOne({
      reference,
      estado: 'pendiente',
      creadaEn: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
    })
    if (recentDuplicate) {
      return jsonResponse(200, {
        requestId: recentDuplicate.requestId,
        processUrl: recentDuplicate.placetopay?.processUrl,
        accessToken: recentDuplicate.paymentAccessToken || null,
        status: { status: 'OK', message: 'Session already exists' },
      }, event, POST_METHODS)
    }

    const bloqueos = await getBloqueosCollection()
    for (const s of slotsForDate) {
      const taken = await isSlotBlockedOrReserved(s, { reservasCol: reservas, bloqueosCol: bloqueos })
      if (taken) {
        return jsonResponse(409, { error: `La pista ${s.pista} a las ${s.hora} ya no está disponible.` }, event, POST_METHODS)
      }
    }

    const baseUrl = process.env.URL || process.env.FRONTEND_URL || 'http://localhost:8888'
    const safeReference = String(reference).trim()

    const result = await createSession({
      reference: safeReference,
      description,
      total: pricing.total,
      currency: 'COP',
      returnUrl: `${baseUrl}/reservas?ref=${encodeURIComponent(safeReference)}&requestId={requestId}`,
      cancelUrl: `${baseUrl}/reservas?ref=${encodeURIComponent(safeReference)}&status=cancelled`,
      notificationUrl: `${baseUrl}/api/payment/notify`,
      ipAddress: ip,
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

    const requestId = String(result.requestId)
    const paymentAccessToken = createPaymentAccessToken(safeReference, requestId)

    for (const s of slotsForDate) {
      const taken = await isSlotBlockedOrReserved(s, { reservasCol: reservas, bloqueosCol: bloqueos })
      if (taken) {
        return jsonResponse(409, { error: `La pista ${s.pista} a las ${s.hora} ya no está disponible.` }, event, POST_METHODS)
      }
    }

    try {
      await reservas.insertOne({
        reference: safeReference,
        requestId,
        paymentAccessToken,
        estado: 'pendiente',
        fecha,
        pistas: pista,
        horas: hora,
        personas: Number(personas),
        extras: extras || '',
        total: pricing.total,
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
    } catch (insertErr) {
      if (insertErr?.code === 11000) {
        return jsonResponse(409, { error: 'Esta referencia ya está en uso. Intenta de nuevo.' }, event, POST_METHODS)
      }
      throw insertErr
    }

    return jsonResponse(200, {
      requestId: result.requestId,
      processUrl: result.processUrl,
      accessToken: paymentAccessToken,
      status: result.status,
    }, event, POST_METHODS)
  } catch (err) {
    console.error('[Payment] Create error:', err.message)
    return jsonResponse(500, { error: apiErrorMessage(err) }, event, POST_METHODS)
  }
}
