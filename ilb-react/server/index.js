import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createHash, randomUUID } from 'crypto'
import { MongoClient } from 'mongodb'
import { createSession, querySession } from './placetopay.js'
import { resolveSessionEstado } from './placetopay-status.js'
import { ROLES, hashPassword, verifyPassword, requireAuth, requireAuthAsync, signAdminToken } from '../netlify/functions/lib/admin-auth.js'
import { validateFechaHorariosReservaColombia } from '../netlify/functions/lib/booking-datetime-colombia.js'
import { isProductionEnv, checkRateLimit, apiErrorMessage } from '../netlify/functions/lib/http-security.js'
import {
  parseSlots,
  isSlotBlockedOrReserved as isSlotBlockedOrReservedDb,
  bloqueoConflictoConReservas,
  normalizeAdminManualSlots,
  buildHorasPipeString,
  bloqueoConflictoConOtrosAdmin,
} from '../netlify/functions/lib/reserva-availability.js'
import {
  defaultFechaDesdeMesAnterior,
  FECHA_YMD_QUERY_RE,
  mapReservaDocToListRow,
  buildReservaListFilter,
} from '../netlify/functions/lib/reservas-list-shared.js'
import { reprogramarReservaAdmin } from '../netlify/functions/lib/admin-reserva-reprogramar-shared.js'

const app = express()
const PORT = Number(process.env.PORT) || 3001

function reqClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1'
}

app.use(cors({
  origin: (origin, cb) => {
    const allowed = new Set([
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:5174',
    ].filter(Boolean))
    // Permitir requests sin Origin (curl, server-to-server)
    if (!origin) return cb(null, true)
    return cb(null, allowed.has(origin))
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Cron-Secret'],
}))
app.use(express.json())

// ─── MongoDB ─────────────────────────────────────────────────
let cachedClient = null
let indexesEnsured = false
let bloqueosIndexesEnsured = false
let adminUsersIndexesEnsured = false
let adminConfigIndexesEnsured = false

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

async function isSlotBlockedOrReserved({ pista, fecha, hora }) {
  const reservasCol = await getReservasCollection()
  const bloqueosCol = await getBloqueosCollection()
  return isSlotBlockedOrReservedDb({ pista, fecha, hora }, { reservasCol, bloqueosCol })
}

async function getAdminUsersCollection() {
  await getReservasCollection()
  const col = cachedClient.db('administracion').collection('admin_users')
  if (!adminUsersIndexesEnsured) {
    await Promise.all([
      col.createIndex({ username: 1 }, { unique: true }),
      col.createIndex({ role: 1 }),
    ])
    adminUsersIndexesEnsured = true
  }
  return col
}

async function getAdminConfigCollection() {
  await getReservasCollection()
  const col = cachedClient.db('administracion').collection('admin_config')
  if (!adminConfigIndexesEnsured) {
    await col.createIndex({ key: 1 }, { unique: true })
    adminConfigIndexesEnsured = true
  }
  return col
}

const DEFAULT_ADMIN_CONFIG = {
  precios: {
    pistaLJ: 120000,
    pistaVD: 132000,
    zapatos: 7500,
    jugadorAdicional: 31000,
  },
  horarios: {
    lunMie: { apertura: '12:00 PM', cierre: '10:00 PM' },
    jueSab: { apertura: '12:00 PM', cierre: '11:00 PM' },
    domFest: { apertura: '12:00 PM', cierre: '9:00 PM' },
  },
  promociones: [],
}

const SEED_USERS = [
  { username: 'admin', role: 'admin' },
  { username: 'operaciones', role: 'operaciones' },
  { username: 'comercial', role: 'comercial' },
  { username: 'adminpruebas', role: 'admin' },
]

function seedUsersForEnv() {
  if (isProductionEnv()) {
    return SEED_USERS.filter(u => u.username !== 'adminpruebas')
  }
  return SEED_USERS
}

async function ensureSeedUsers() {
  if (isProductionEnv() && process.env.ALLOW_ADMIN_SEED !== 'true') return

  const col = await getAdminUsersCollection()
  const defaultPass = process.env.ADMIN_BOOTSTRAP_PASSWORD || 'bolera2026'
  const passwordHash = await hashPassword(defaultPass)
  for (const { username, role } of seedUsersForEnv()) {
    const exists = await col.findOne({ username })
    if (!exists) {
      await col.insertOne({
        username,
        role,
        passwordHash,
        tokenVersion: 0,
        createdAt: new Date(),
        seeded: true,
      })
    }
  }
}

async function getOrInitAdminConfig() {
  const col = await getAdminConfigCollection()
  const existing = await col.findOne({ key: 'main' })
  if (existing?.value) return existing.value
  await col.updateOne(
    { key: 'main' },
    { $set: { key: 'main', value: DEFAULT_ADMIN_CONFIG, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  )
  return DEFAULT_ADMIN_CONFIG
}

// ─── Health check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── Admin auth/config (dev server parity with Netlify) ───────
app.post('/api/admin/login', async (req, res) => {
  try {
    const ip = reqClientIp(req)
    if (!checkRateLimit(`admin-login:${ip}`, { max: 10, windowMs: 15 * 60 * 1000 })) {
      return res.status(429).json({ error: 'Demasiados intentos. Intenta más tarde.' })
    }

    await ensureSeedUsers()
    const username = String(req.body?.username || '').trim().toLowerCase()
    const password = String(req.body?.password || '')
    if (!username || !password) return res.status(400).json({ error: 'username y password son requeridos' })

    const col = await getAdminUsersCollection()
    const user = await col.findOne({ username })
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado. Revisa el nombre (sin espacios).' })
    }

    const master = process.env.ADMIN_MASTER_PASSWORD
    const isAdminRole = user.role === 'admin'
    const allowMaster = master && isAdminRole && (!isProductionEnv() || process.env.ALLOW_ADMIN_MASTER === 'true')

    if (allowMaster && password === String(master)) {
      const passwordHash = await hashPassword(password)
      await col.updateOne(
        { username: user.username },
        { $set: { passwordHash, updatedAt: new Date(), updatedBy: 'bootstrap' } }
      )
    } else {
      if (!user.passwordHash) {
        return res.status(401).json({ error: 'Usuario sin contraseña configurada.' })
      }
      const ok = await verifyPassword(password, user.passwordHash)
      if (!ok) return res.status(401).json({ error: 'Contraseña incorrecta.' })
    }

    const token = signAdminToken({
      username: user.username,
      role: user.role,
      tokenVersion: user.tokenVersion || 0,
    })
    const roleInfo = ROLES[user.role]

    res.json({
      token,
      user: {
        username: user.username,
        role: user.role,
        roleLabel: roleInfo?.label || user.role,
        permissions: roleInfo?.permissions || [],
      },
    })
  } catch (err) {
    console.error('[AdminLogin]', err.message)
    res.status(500).json({ error: apiErrorMessage(err) })
  }
})

app.get('/api/admin/config', async (req, res) => {
  const auth = requireAuth({ headers: req.headers }, ['config:read'])
  if (!auth.ok) return res.status(auth.statusCode).json({ error: auth.error })
  try {
    const value = await getOrInitAdminConfig()
    res.json({ config: value })
  } catch (err) {
    console.error('[AdminConfig]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Public config (precios/horarios/promos) ─────────────────
app.get('/api/config', async (req, res) => {
  try {
    const value = await getOrInitAdminConfig()
    res.json({ config: value })
  } catch (err) {
    console.error('[PublicConfig]', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/admin/config', async (req, res) => {
  const auth = requireAuth({ headers: req.headers }, ['config:write'])
  if (!auth.ok) return res.status(auth.statusCode).json({ error: auth.error })
  try {
    const current = await getOrInitAdminConfig()
    const next = {
      ...current,
      ...(req.body?.precios ? { precios: { ...current.precios, ...req.body.precios } } : {}),
      ...(req.body?.horarios ? { horarios: { ...current.horarios, ...req.body.horarios } } : {}),
      ...(req.body?.promociones ? { promociones: Array.isArray(req.body.promociones) ? req.body.promociones : current.promociones } : {}),
    }
    const col = await getAdminConfigCollection()
    await col.updateOne({ key: 'main' }, { $set: { value: next, updatedAt: new Date() } }, { upsert: true })
    res.json({ config: next })
  } catch (err) {
    console.error('[AdminConfig]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Admin: inactivar/borrar reservas online ──────────────────
app.patch('/api/admin/reservas', async (req, res) => {
  const auth = requireAuth({ headers: req.headers }, ['reservas:write'])
  if (!auth.ok) return res.status(auth.statusCode).json({ error: auth.error })
  try {
    const reference = String(req.body?.reference || '').trim()
    const action = String(req.body?.action || '').trim()
    if (!reference) return res.status(400).json({ error: 'reference es requerido' })

    const reservas = await getReservasCollection()
    if (action === 'inactivar') {
      const result = await reservas.findOneAndUpdate(
        { reference },
        {
          $set: {
            estado: 'cancelada',
            adminOverride: true,
            adminOverrideReason: req.body?.reason ? String(req.body.reason) : 'Inactivada por admin',
            actualizadaEn: new Date(),
          },
        },
        { returnDocument: 'after' }
      )
      return res.json({ reserva: result })
    }

    if (action === 'reprogramar') {
      const bloqueosCol = await getBloqueosCollection()
      const outcome = await reprogramarReservaAdmin({
        reservasCol: reservas,
        bloqueosCol,
        reference,
        fecha: req.body?.fecha,
        slots: req.body?.slots,
        username: auth.user?.username,
      })
      if (!outcome.ok) return res.status(outcome.status).json({ error: outcome.error })
      return res.json({ reserva: mapReservaDocToListRow(outcome.reserva) })
    }

    return res.status(400).json({ error: 'action inválida' })
  } catch (err) {
    console.error('[AdminReservas]', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/admin/reservas', async (req, res) => {
  const auth = requireAuth({ headers: req.headers }, ['reservas:write'])
  if (!auth.ok) return res.status(auth.statusCode).json({ error: auth.error })
  try {
    const reference = String(req.body?.reference || '').trim()
    if (!reference) return res.status(400).json({ error: 'reference es requerido' })
    const reservas = await getReservasCollection()
    const result = await reservas.deleteOne({ reference })
    res.json({ deleted: result.deletedCount })
  } catch (err) {
    console.error('[AdminReservas]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Admin: reserva manual (persiste en BD como exitosa) ─────
app.post('/api/admin/reserva-manual', async (req, res) => {
  const auth = requireAuth({ headers: req.headers }, ['reservas:write'])
  if (!auth.ok) return res.status(auth.statusCode).json({ error: auth.error })
  try {
    const body = req.body || {}
    const fecha = String(body.fecha || '').trim()
    const nombre = String(body.nombre || '').trim()
    const telefono = String(body.telefono || '').trim()
    const correo = String(body.correo || '').trim()
    const fechaNacimiento = String(body.fechaNacimiento || body.fechaCumpleanos || '').trim()
    const tipoDocumento = String(body.tipoDocumento || '').trim()
    const documento = String(body.documento || '').trim()
    const notas = body.notas != null ? String(body.notas) : ''
    const metodoPago = body.metodoPago != null ? String(body.metodoPago) : ''
    const personas = body.personas !== undefined && body.personas !== null && body.personas !== ''
      ? Number(body.personas)
      : 2

    let slotsNormalized = []
    if (Array.isArray(body.slots) && body.slots.length > 0) {
      slotsNormalized = normalizeAdminManualSlots(body.slots)
      if (slotsNormalized.length === 0) {
        return res.status(400).json({ error: 'No hay slots válidos: incluye pista (1–11) y hora en cada fila.' })
      }
    }
    else {
      const pista = Number(body.pista)
      const hora = String(body.hora || '').trim()
      if (!Number.isInteger(pista) || pista < 1 || pista > 11) {
        return res.status(400).json({ error: 'pista debe ser un número entre 1 y 11' })
      }
      if (!fecha || !hora) return res.status(400).json({ error: 'fecha y hora son requeridos' })
      slotsNormalized = normalizeAdminManualSlots([{ pista, hora }])
    }

    if (!fecha) return res.status(400).json({ error: 'fecha es requerida' })
    if (!nombre) return res.status(400).json({ error: 'nombre es requerido' })
    if (!Number.isFinite(personas) || personas < 1 || personas > 6) {
      return res.status(400).json({ error: 'personas debe ser un número entre 1 y 6' })
    }

    const horasUnicas = [...new Set(slotsNormalized.map(s => s.hora))]
    const fechaHoraErr = validateFechaHorariosReservaColombia(fecha, horasUnicas)
    if (fechaHoraErr) return res.status(400).json({ error: fechaHoraErr })

    const reservasCol = await getReservasCollection()
    const bloqueosCol = await getBloqueosCollection()
    for (const s of slotsNormalized) {
      const taken = await isSlotBlockedOrReservedDb(
        { pista: s.pista, fecha, hora: s.hora },
        { reservasCol, bloqueosCol }
      )
      if (taken) {
        return res.status(409).json({
          error: `La pista ${s.pista} no está disponible el ${fecha} a las ${s.hora} (reservada o bloqueada).`,
        })
      }
    }

    const reference = `MANUAL-${randomUUID()}`
    const horasStr = buildHorasPipeString(slotsNormalized)
    const pistasNums = [...new Set(slotsNormalized.map(s => s.pista))].sort((a, b) => a - b)
    const pistasCampo = pistasNums.join(', ')

    const doc = {
      reference,
      estado: 'exitosa',
      origen: 'manual',
      fecha,
      pistas: pistasCampo,
      horas: horasStr,
      personas,
      total: 0,
      extras: '',
      description: slotsNormalized.length > 1 ? `Reserva manual (${slotsNormalized.length} slots)` : 'Reserva manual (portal admin)',
      datosPersonales: {
        nombre,
        telefono,
        correo,
        tipoDocumento,
        documento,
        fechaNacimiento,
      },
      metodoPago,
      notas,
      requestId: `manual-${reference}`,
      creadaEn: new Date(),
      actualizadaEn: new Date(),
      creadaPor: auth.user?.username || 'admin',
    }
    await reservasCol.insertOne(doc)
    res.status(201).json({
      reserva: {
        reference,
        estado: doc.estado,
        origen: doc.origen,
        fecha,
        pistas: pistasCampo,
        horas: horasStr,
        personas,
      },
    })
  } catch (err) {
    console.error('[AdminReservaManual]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Admin: usuarios (cambiar contraseña) ─────────────────────
app.get('/api/admin/users', async (req, res) => {
  const auth = requireAuth({ headers: req.headers }, ['users:write'])
  if (!auth.ok) return res.status(auth.statusCode).json({ error: auth.error })
  try {
    const col = await getAdminUsersCollection()
    const users = await col.find({}).project({ username: 1, role: 1, createdAt: 1, updatedAt: 1 }).sort({ username: 1 }).toArray()
    res.json({
      users: users.map(u => ({
        username: u.username,
        role: u.role,
        roleLabel: ROLES[u.role]?.label || u.role,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
    })
  } catch (err) {
    console.error('[AdminUsers]', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.patch('/api/admin/users', async (req, res) => {
  const auth = requireAuth({ headers: req.headers }, ['users:write'])
  if (!auth.ok) return res.status(auth.statusCode).json({ error: auth.error })
  try {
    const username = String(req.body?.username || '').trim().toLowerCase()
    const newPassword = String(req.body?.newPassword || '')
    if (!username || !newPassword) return res.status(400).json({ error: 'username y newPassword son requeridos' })
    if (newPassword.length < 8) return res.status(400).json({ error: 'La contraseña debe tener mínimo 8 caracteres' })

    const passwordHash = await hashPassword(newPassword)
    const col = await getAdminUsersCollection()
    const result = await col.findOneAndUpdate(
      { username },
      {
        $set: { passwordHash, updatedAt: new Date(), updatedBy: auth.user.username },
        $inc: { tokenVersion: 1 },
      },
      { returnDocument: 'after' }
    )
    if (!result) return res.status(404).json({ error: 'Usuario no encontrado' })

    res.json({
      user: {
        username: result.username,
        role: result.role,
        roleLabel: ROLES[result.role]?.label || result.role,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      },
    })
  } catch (err) {
    console.error('[AdminUsers]', err.message)
    res.status(500).json({ error: err.message })
  }
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

    if (!fecha || !hora) {
      return res.status(400).json({ error: 'fecha y hora son requeridos' })
    }

    const slotsForDate = parseSlots(fecha, hora)
    if (slotsForDate.length === 0) {
      return res.status(400).json({ error: 'Datos de pista / horario inválidos' })
    }

    const fechaHoraErr = validateFechaHorariosReservaColombia(
      fecha,
      slotsForDate.map(s => s.hora)
    )
    if (fechaHoraErr) return res.status(400).json({ error: fechaHoraErr })

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

    // Validar disponibilidad (bloqueos + reservas existentes) antes de crear sesión de pago
    const slotsToCheck = slotsForDate
    for (const s of slotsToCheck) {
      // eslint-disable-next-line no-await-in-loop
      const taken = await isSlotBlockedOrReserved(s)
      if (taken) {
        return res.status(409).json({ error: `La pista ${s.pista} a las ${s.hora} ya no está disponible.` })
      }
    }

    const baseUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`

    const result = await createSession({
      reference,
      description,
      total,
      currency: 'COP',
      returnUrl: `${baseUrl}/reservas?ref=${encodeURIComponent(reference)}&requestId={requestId}`,
      cancelUrl: `${baseUrl}/reservas?ref=${encodeURIComponent(reference)}&status=cancelled`,
      notificationUrl: `${baseUrl}/api/payment/notify`,
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
    const { estado, sessionStatus, statusMessage } = resolveSessionEstado(result)

    const reservas = await getReservasCollection()
    const reserva = await reservas.findOneAndUpdate(
      { requestId: String(requestId) },
      { $set: { estado, 'placetopay.status': sessionStatus, 'placetopay.statusMessage': statusMessage, actualizadaEn: new Date() } },
      { returnDocument: 'after' }
    )

    console.log(`[Payment] Verify: requestId=${requestId} estado=${estado}`)

    res.json({
      requestId: result.requestId,
      estado,
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

    let verifiedNotificationStatus

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

      verifiedNotificationStatus = statusValue
      console.log(`[Webhook] Signature verified OK for requestId=${requestId}`)
    } else {
      console.warn(`[Webhook] No signature provided for requestId=${requestId} — proceeding with query verification`)
    }

    // Consultar estado actualizado en PlaceToPay para confirmar
    const result = await querySession(requestId)
    const { estado, sessionStatus, statusMessage } = resolveSessionEstado(result, {
      notificationStatus: verifiedNotificationStatus,
    })

    const reservas = await getReservasCollection()
    await reservas.updateOne(
      { requestId: String(requestId) },
      {
        $set: {
          estado,
          'placetopay.status': sessionStatus,
          'placetopay.statusMessage': statusMessage,
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

// ─── Cancel payment (user aborted flow) ───────────────────────
app.post('/api/payment/cancel', async (req, res) => {
  try {
    const reference = String(req.body?.reference || '').trim()
    const requestId = req.body?.requestId ? String(req.body.requestId).trim() : ''
    if (!reference && !requestId) return res.status(400).json({ error: 'reference o requestId es requerido' })

    const reservas = await getReservasCollection()
    const filter = reference ? { reference } : { requestId }
    const result = await reservas.updateOne(
      { ...filter, estado: { $in: ['pendiente'] } },
      {
        $set: {
          estado: 'cancelada',
          'placetopay.status': 'CANCELLED',
          'placetopay.statusMessage': req.body?.reason ? String(req.body.reason) : 'Cancelada por el usuario',
          canceladaPorUsuario: true,
          actualizadaEn: new Date(),
        },
      }
    )

    res.json({ updated: result.modifiedCount })
  } catch (err) {
    console.error('[PaymentCancel]', err.message)
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

    const timeoutMinutes = Number(process.env.PENDING_TIMEOUT_MINUTES || 30)
    const timeoutMs = Math.max(5, timeoutMinutes) * 60 * 1000
    const expiredBefore = new Date(Date.now() - timeoutMs)

    for (const reserva of pendientes) {
      try {
        if (reserva.creadaEn && new Date(reserva.creadaEn) < expiredBefore) {
          const result = await querySession(reserva.requestId)
          const { estado, sessionStatus, statusMessage } = resolveSessionEstado(result)

          if (estado !== 'pendiente') {
            await reservas.updateOne(
              { requestId: String(reserva.requestId) },
              {
                $set: {
                  estado,
                  'placetopay.status': sessionStatus,
                  'placetopay.statusMessage': statusMessage,
                  actualizadaEn: new Date(),
                  resolvedByCron: true,
                },
              }
            )
            resolved++
            results.push({ ref: reserva.reference, requestId: reserva.requestId, from: 'pendiente', to: estado, reason: 'late_approval' })
            console.log(`[CronJob] Late approval: ref=${reserva.reference} → ${estado}`)
            continue
          }

          await reservas.updateOne(
            { requestId: String(reserva.requestId) },
            {
              $set: {
                estado: 'cancelada',
                'placetopay.status': 'CANCELLED',
                'placetopay.statusMessage': `Expirada por tiempo (${timeoutMinutes} min)`,
                actualizadaEn: new Date(),
                resolvedByCronTimeout: true,
              },
            }
          )
          resolved++
          results.push({ ref: reserva.reference, requestId: reserva.requestId, from: 'pendiente', to: 'cancelada', reason: 'timeout' })
          console.log(`[CronJob] Expired: ref=${reserva.reference} → cancelada`)
          continue
        }

        const result = await querySession(reserva.requestId)
        const { estado, sessionStatus, statusMessage } = resolveSessionEstado(result)

        if (estado !== 'pendiente') {
          await reservas.updateOne(
            { requestId: String(reserva.requestId) },
            {
              $set: {
                estado,
                'placetopay.status': sessionStatus,
                'placetopay.statusMessage': statusMessage,
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
function mapBloqueoPublic(d) {
  return {
    id: d.id,
    pista: d.pista,
    fechaInicio: d.fechaInicio,
    fechaFin: d.fechaFin,
    horas: Array.isArray(d.horas) ? d.horas : [],
    fecha: d.fecha,
  }
}

function mapBloqueoFull(d) {
  return {
    ...mapBloqueoPublic(d),
    motivo: d.motivo || '',
    metodoPago: d.metodoPago || '',
    comentarios: d.comentarios || '',
    personas: typeof d.personas === 'number' ? d.personas : (d.personas ? Number(d.personas) : undefined),
    creadaEn: d.creadaEn,
  }
}

app.get('/api/bloqueos', async (req, res) => {
  try {
    const col = await getBloqueosCollection()
    const docs = await col.find({}).sort({ fechaInicio: 1, pista: 1 }).toArray()
    const auth = requireAuth({ headers: req.headers }, ['pistas:read'])
    const mapper = auth.ok ? mapBloqueoFull : mapBloqueoPublic
    res.json({ bloqueos: docs.map(mapper) })
  } catch (err) {
    res.status(500).json({ error: apiErrorMessage(err) })
  }
})

app.post('/api/bloqueos', async (req, res) => {
  const auth = requireAuth({ headers: req.headers }, ['pistas:write'])
  if (!auth.ok) return res.status(auth.statusCode).json({ error: auth.error })
  try {
    const { fechaInicio, fechaFin, motivo = '' } = req.body
    const pista = Number(req.body.pista)
    const horas = Array.isArray(req.body.horas) ? req.body.horas : []
    const metodoPago = req.body.metodoPago ? String(req.body.metodoPago) : ''
    const comentarios = req.body.comentarios ? String(req.body.comentarios) : ''
    const personas = req.body.personas !== undefined && req.body.personas !== null && req.body.personas !== ''
      ? Number(req.body.personas)
      : undefined

    if (!Number.isInteger(pista) || pista < 1 || !fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'pista, fechaInicio y fechaFin son requeridos' })
    }
    if (personas !== undefined && (!Number.isFinite(personas) || personas < 1 || personas > 60)) {
      return res.status(400).json({ error: 'personas debe ser un número entre 1 y 60' })
    }

    const reservasCol = await getReservasCollection()
    const conflicto = await bloqueoConflictoConReservas({ pista, fechaInicio, fechaFin, horas }, reservasCol)
    if (conflicto) return res.status(409).json({ error: conflicto })

    const bloqueosCol = await getBloqueosCollection()
    const conflictoOtros = await bloqueoConflictoConOtrosAdmin(bloqueosCol, {
      pista,
      fechaInicio,
      fechaFin,
      horas,
    })
    if (conflictoOtros) return res.status(409).json({ error: conflictoOtros })

    const id = (typeof req.body.id === 'string' && req.body.id) ? req.body.id : randomUUID()
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
    if (req.body.fecha) doc.fecha = req.body.fecha

    await bloqueosCol.insertOne(doc)
    res.status(201).json({ bloqueo: { ...doc, creadaEn: doc.creadaEn } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/bloqueos', async (req, res) => {
  const auth = requireAuth({ headers: req.headers }, ['pistas:write'])
  if (!auth.ok) return res.status(auth.statusCode).json({ error: auth.error })
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
    const usersCol = await getAdminUsersCollection()
    const auth = await requireAuthAsync({ headers: req.headers }, ['reservas:read'], usersCol)
    if (!auth.ok) return res.status(auth.statusCode).json({ error: auth.error })

    let fechaDesde = req.query.fechaDesde
    if (fechaDesde === undefined || fechaDesde === null || fechaDesde === '') {
      fechaDesde = defaultFechaDesdeMesAnterior()
    } else if (!FECHA_YMD_QUERY_RE.test(String(fechaDesde))) {
      return res.status(400).json({ error: 'fechaDesde debe ser YYYY-MM-DD' })
    } else {
      fechaDesde = String(fechaDesde)
    }

    const rawSkip = Number.parseInt(String(req.query.skip ?? ''), 10)
    const skip = Number.isFinite(rawSkip) && rawSkip >= 0 ? Math.min(rawSkip, 500000) : 0

    const rawLim = Number.parseInt(String(req.query.limit ?? ''), 10)
    const limit = Number.isFinite(rawLim)
      ? Math.min(Math.max(rawLim, 1), 500)
      : 250

    const filter = buildReservaListFilter(fechaDesde)

    const reservasCol = await getReservasCollection()
    const docs = await reservasCol
      .find(filter)
      .sort({ creadaEn: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const list = docs.map(mapReservaDocToListRow)
    const hasMore = docs.length === limit

    res.json({
      reservas: list,
      hasMore,
      fechaDesde,
      skip,
      limit,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Confirmed slots (for lane blocking) ─────────────────────
app.get('/api/reservas/slots', async (req, res) => {
  try {
    const reservas = await getReservasCollection()
    const holdSince = new Date(Date.now() - 30 * 60 * 1000)
    const confirmed = await reservas.find({
      $or: [
        { estado: 'exitosa' },
        { estado: 'pendiente', actualizadaEn: { $gte: holdSince } },
      ],
    }).project({ fecha: 1, pistas: 1, horas: 1 }).toArray()
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

  // Fallback SPA (sin wildcard Express 5 — más compatible en Hostinger)
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (req.path.startsWith('/api')) return next()
    res.sendFile(join(__dirname, '..', 'dist', 'index.html'), (err) => {
      if (err) next(err)
    })
  })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎳 ILB Server running on 0.0.0.0:${PORT}`)
  console.log(`   Environment: ${process.env.PLACETOPAY_ENV || 'sandbox'}`)
  console.log(`   PlaceToPay: ${process.env.PLACETOPAY_LOGIN ? '✅' : '❌'}`)
  console.log(`   MongoDB: ${process.env.MONGODB_URI ? '✅' : '❌'}\n`)
})
