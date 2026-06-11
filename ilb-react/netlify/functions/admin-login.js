import { getAdminUsersCollection } from './lib/db.js'
import { ROLES, hashPassword, verifyPassword, signAdminToken } from './lib/admin-auth.js'
import { checkRateLimit, getClientIp, isProductionEnv, apiErrorMessage, jsonResponse } from './lib/http-security.js'

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

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(204, {}, event, 'POST, OPTIONS')
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, event, 'POST, OPTIONS')

  try {
    const ip = getClientIp(event)
    if (!checkRateLimit(`admin-login:${ip}`, { max: 10, windowMs: 15 * 60 * 1000 })) {
      return jsonResponse(429, { error: 'Demasiados intentos. Intenta más tarde.' }, event, 'POST, OPTIONS')
    }

    await ensureSeedUsers()
    const body = JSON.parse(event.body || '{}')
    const username = String(body.username || '').trim().toLowerCase()
    const password = String(body.password || '')
    if (!username || !password) return jsonResponse(400, { error: 'username y password son requeridos' }, event, 'POST, OPTIONS')

    const col = await getAdminUsersCollection()
    const user = await col.findOne({ username })
    if (!user) {
      return jsonResponse(401, { error: 'Usuario no encontrado. Revisa el nombre (sin espacios).' }, event, 'POST, OPTIONS')
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
        return jsonResponse(401, { error: 'Usuario sin contraseña configurada.' }, event, 'POST, OPTIONS')
      }
      const ok = await verifyPassword(password, user.passwordHash)
      if (!ok) return jsonResponse(401, { error: 'Contraseña incorrecta.' }, event, 'POST, OPTIONS')
    }

    const token = signAdminToken({
      username: user.username,
      role: user.role,
      tokenVersion: user.tokenVersion || 0,
    })
    const roleInfo = ROLES[user.role]

    return jsonResponse(200, {
      token,
      user: {
        username: user.username,
        role: user.role,
        roleLabel: roleInfo?.label || user.role,
        permissions: roleInfo?.permissions || [],
      },
    }, event, 'POST, OPTIONS')
  } catch (err) {
    console.error('[AdminLogin]', err.message)
    return jsonResponse(500, { error: apiErrorMessage(err) }, event, 'POST, OPTIONS')
  }
}
