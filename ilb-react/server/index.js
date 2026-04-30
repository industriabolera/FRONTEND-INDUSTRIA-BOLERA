import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createHash, randomUUID } from 'crypto'
import { MongoClient } from 'mongodb'
import { createSession, querySession } from './placetopay.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
}))
app.use(express.json())

// ─── MongoDB ─────────────────────────────────────────────────
let cachedClient = null
let indexesEnsured = false
let bloqueosIndexesEnsured = false

async function getReservasCollection() {
  if (!cachedClient) {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI no está configurada en .env')
    const client = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 10, serverSelectionTimeoutMS: 5000 })
    await client.connect()
    cachedClient = client
    console.log('[MongoDB] Connected')
  }
  const col = cachedClient.db('administracion').collection('reservas')
  if (!indexesEnsured) {
    await Promise.all([
      col.createIndex({ reference: 1 }, { unique: true }),
      col.createIndex({ requestId: 1 }),
      col.createIndex({ estado: 1 }),
      col.createIndex({ fecha: 1 }),
    ])
    indexesEnsured = true
  }
  return col
}

async function getBloqueosCollection() {
  await getReservasCollection()
  const col = cachedClient.db('administracion').collection('bloqueos')
  if (!bloqueosIndexesEnsured) {
    await col.createIndex({ id: 1 }, { unique: true })
    bloqueosIndexesEnsured = true
  }
  return col
}

function mapStatus(s) {
  if (s === 'APPROVED') return 'exitosa'
  if (s === 'REJECTED') return 'rechazada'
  if (s === 'CANCELLED') return 'cancelada'
  return 'pendiente'
}

// ─── Health check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── Create payment session ──────────────────────────────────
app.post('/api/payment/create', async (req, res) => {
  try {
    const {
      reference, description, total,
      pista, fecha, hora, personas, extras,
      datosPersonales,
    } = req.body

    if (!reference || !total || !description) {
      return res.status(400).json({ error: 'reference, total y description son requeridos' })
    }

    if (!datosPersonales?.nombre || !datosPersonales?.telefono || !datosPersonales?.correo || !datosPersonales?.documento) {
      return res.status(400).json({ error: 'Datos personales son requeridos' })
    }

    // Validar nombre: solo letras, tildes, ñ, espacios, guiones
    const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/
    if (!namePattern.test(datosPersonales.nombre.trim())) {
      return res.status(400).json({ error: 'El nombre solo puede contener letras, tildes, ñ, espacios y guiones' })
    }

    // ── Anti-duplicado: verificar si ya existe una sesión pendiente reciente para esta reserva ──
    const reservas = await getReservasCollection()
    const recentDuplicate = await reservas.findOne({
      reference,
      estado: 'pendiente',
      creadaEn: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // últimos 5 minutos
    })
    if (recentDuplicate) {
      console.log(`[Payment] Duplicate blocked: ref=${reference} (existing requestId=${recentDuplicate.requestId})`)
      return res.json({
        requestId: recentDuplicate.requestId,
        processUrl: recentDuplicate.placetopay?.processUrl,
        status: { status: 'OK', message: 'Session already exists' },
      })
    }

    const baseUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`

    const result = await createSession({
      reference,
      description,
      total,
      currency: 'COP',
      returnUrl: `${baseUrl}/reservas?ref=${encodeURIComponent(reference)}&requestId={requestId}`,
      cancelUrl: `${baseUrl}/reservas?ref=${encodeURIComponent(reference)}&status=cancelled`,
      ipAddress: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'ILB Reservas',
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

    res.json({
      requestId: result.requestId,
      processUrl: result.processUrl,
      status: result.status,
    })

  } catch (err) {
    console.error('[Payment] Create session error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Verify payment status ───────────────────────────────────
app.post('/api/payment/verify', async (req, res) => {
  try {
    const { requestId } = req.body

    if (!requestId) {
      return res.status(400).json({ error: 'requestId is required' })
    }

    const result = await querySession(requestId)
    const paymentStatus = result.status?.status
    const estado = mapStatus(paymentStatus)

    const reservas = await getReservasCollection()
    const reserva = await reservas.findOneAndUpdate(
      { requestId: String(requestId) },
      { $set: { estado, 'placetopay.status': paymentStatus, 'placetopay.statusMessage': result.status?.message, actualizadaEn: new Date() } },
      { returnDocument: 'after' }
    )

    console.log(`[Payment] Verify: requestId=${requestId} estado=${estado}`)

    res.json({
      requestId: result.requestId,
      status: result.status,
      payment: result.payment,
      reserva: reserva ? {
        reference: reserva.reference,
        fecha: reserva.fecha,
        pistas: reserva.pistas,
        horas: reserva.horas,
        personas: reserva.personas,
        extras: reserva.extras,
        total: reserva.total,
        description: reserva.description,
        datosPersonales: reserva.datosPersonales,
        creadaEn: reserva.creadaEn,
      } : null,
    })

  } catch (err) {
    console.error('[Payment] Verify error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── PlaceToPay async notification webhook ───────────────────
// Estructura esperada: { status: { status, message, reason, date }, requestId, reference, signature }
// Firma: SHA-256(requestId + status.status + status.date + secretKey)
// Ref: https://docs.placetopay.dev/checkout/notification
app.post('/api/payment/notify', async (req, res) => {
  try {
    const { status, requestId, reference, signature } = req.body

    if (!requestId) {
      return res.status(400).json({ error: 'requestId is required' })
    }

    // ── Validar firma del webhook ──
    if (signature) {
      const secretKey = process.env.PLACETOPAY_TRANKEY
      const statusValue = status?.status || ''
      const dateValue = status?.date || ''

      // Generar firma esperada con SHA-256
      const expectedSignature = createHash('sha256')
        .update(String(requestId) + statusValue + dateValue + secretKey)
        .digest('hex')

      // Soportar firma con prefijo "sha256:" o sin prefijo
      const receivedSignature = signature.startsWith('sha256:')
        ? signature.slice(7)
        : signature

      if (receivedSignature !== expectedSignature) {
        console.warn(`[Webhook] Invalid signature for requestId=${requestId}. Expected=${expectedSignature}, Received=${receivedSignature}`)
        return res.status(401).json({ error: 'Invalid signature' })
      }

      console.log(`[Webhook] Signature verified OK for requestId=${requestId}`)
    } else {
      console.warn(`[Webhook] No signature provided for requestId=${requestId} — proceeding with query verification`)
    }

    // Consultar estado actualizado en PlaceToPay para confirmar
    const result = await querySession(requestId)
    const paymentStatus = result.status?.status
    const estado = mapStatus(paymentStatus)

    const reservas = await getReservasCollection()
    await reservas.updateOne(
      { requestId: String(requestId) },
      {
        $set: {
          estado,
          'placetopay.status': paymentStatus,
          'placetopay.statusMessage': result.status?.message,
          actualizadaEn: new Date(),
          notifiedByWebhook: true,
        },
      }
    )

    console.log(`[Webhook] ${estado.toUpperCase()} — ref=${reference} requestId=${requestId}`)

    res.json({ status: 'ok' })

  } catch (err) {
    console.error('[Webhook] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Cron/Sonda: Resolve pending payments ────────────────────
// Frecuencia: Cada 24 horas
// Hora: 3:00 AM (hora Colombia, UTC-5) = 8:00 AM UTC
// Cron: "0 8 * * *" (configurado en netlify.toml)
// Puede invocarse manualmente: POST /api/payment/resolve-pending
app.post('/api/payment/resolve-pending', async (req, res) => {
  try {
    const reservas = await getReservasCollection()
    const pendientes = await reservas
      .find({ estado: 'pendiente' })
      .project({ requestId: 1, reference: 1, creadaEn: 1 })
      .toArray()

    console.log(`[CronJob] Found ${pendientes.length} pending reservations to resolve`)

    let resolved = 0
    let errors = 0
    const results = []

    for (const reserva of pendientes) {
      try {
        const result = await querySession(reserva.requestId)
        const paymentStatus = result.status?.status
        const estado = mapStatus(paymentStatus)

        if (estado !== 'pendiente') {
          await reservas.updateOne(
            { requestId: String(reserva.requestId) },
            {
              $set: {
                estado,
                'placetopay.status': paymentStatus,
                'placetopay.statusMessage': result.status?.message,
                actualizadaEn: new Date(),
                resolvedByCron: true,
              },
            }
          )
          resolved++
          results.push({ ref: reserva.reference, requestId: reserva.requestId, from: 'pendiente', to: estado })
          console.log(`[CronJob] Resolved: ref=${reserva.reference} → ${estado}`)
        }
      } catch (err) {
        errors++
        console.error(`[CronJob] Error resolving requestId=${reserva.requestId}: ${err.message}`)
      }
      // Pausa para no saturar la API de PlaceToPay
      await new Promise(r => setTimeout(r, 200))
    }

    res.json({
      total: pendientes.length,
      resolved,
      stillPending: pendientes.length - resolved - errors,
      errors,
      results,
      executedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[CronJob] Fatal error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Bloqueos de pista (colección `bloqueos`, no `reservas`) ───
app.get('/api/bloqueos', async (req, res) => {
  try {
    const col = await getBloqueosCollection()
    const docs = await col.find({}).sort({ fechaInicio: 1, pista: 1 }).toArray()
    const list = docs.map(d => ({
      id: d.id,
      pista: d.pista,
      fechaInicio: d.fechaInicio,
      fechaFin: d.fechaFin,
      horas: Array.isArray(d.horas) ? d.horas : [],
      motivo: d.motivo || '',
      fecha: d.fecha,
      creadaEn: d.creadaEn,
    }))
    res.json({ bloqueos: list })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/bloqueos', async (req, res) => {
  try {
    const { fechaInicio, fechaFin, motivo = '' } = req.body
    const pista = Number(req.body.pista)
    const horas = Array.isArray(req.body.horas) ? req.body.horas : []

    if (!Number.isInteger(pista) || pista < 1 || !fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'pista, fechaInicio y fechaFin son requeridos' })
    }

    const id = (typeof req.body.id === 'string' && req.body.id) ? req.body.id : randomUUID()
    const doc = {
      id,
      pista,
      fechaInicio,
      fechaFin,
      horas,
      motivo: String(motivo),
      creadaEn: new Date(),
    }
    if (req.body.fecha) doc.fecha = req.body.fecha

    const col = await getBloqueosCollection()
    await col.insertOne(doc)
    res.status(201).json({ bloqueo: { ...doc, creadaEn: doc.creadaEn } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/bloqueos', async (req, res) => {
  try {
    const id = req.body?.id
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'id es requerido' })
    }
    const col = await getBloqueosCollection()
    const result = await col.deleteOne({ id })
    res.json({ deleted: result.deletedCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── List reservations (admin dashboard) ─────────────────────
app.get('/api/reservas', async (req, res) => {
  try {
    const reservas = await getReservasCollection()
    const docs = await reservas.find({}).sort({ creadaEn: -1 }).limit(200).toArray()
    const list = docs.map(d => ({
      reference: d.reference, estado: d.estado, fecha: d.fecha,
      pistas: d.pistas, horas: d.horas, personas: d.personas,
      extras: d.extras, total: d.total, description: d.description,
      datosPersonales: d.datosPersonales, creadaEn: d.creadaEn, actualizadaEn: d.actualizadaEn,
    }))
    res.json({ reservas: list })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Confirmed slots (for lane blocking) ─────────────────────
app.get('/api/reservas/slots', async (req, res) => {
  try {
    const reservas = await getReservasCollection()
    const confirmed = await reservas.find({ estado: 'exitosa' }).project({ fecha: 1, pistas: 1, horas: 1 }).toArray()
    const slots = confirmed.flatMap(r => {
      const result = []
      ;(r.horas || '').split('|').forEach(block => {
        const m = block.match(/^P(\d+):(.+)$/)
        if (m) {
          const pista = parseInt(m[1], 10)
          m[2].split(',').forEach(h => result.push({ pista, fecha: r.fecha, hora: h.trim() }))
        }
      })
      return result
    })
    res.json({ slots })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Serve static files in production ────────────────────────
if (process.env.NODE_ENV === 'production') {
  const { dirname, join } = await import('path')
  const { fileURLToPath } = await import('url')
  const __dirname = dirname(fileURLToPath(import.meta.url))

  app.use(express.static(join(__dirname, '..', 'dist')))

  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '..', 'dist', 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`\n🎳 ILB Server running on port ${PORT}`)
  console.log(`   Environment: ${process.env.PLACETOPAY_ENV || 'sandbox'}`)
  console.log(`   PlaceToPay: ${process.env.PLACETOPAY_LOGIN ? '✅' : '❌'}`)
  console.log(`   MongoDB: ${process.env.MONGODB_URI ? '✅' : '❌'}\n`)
})
