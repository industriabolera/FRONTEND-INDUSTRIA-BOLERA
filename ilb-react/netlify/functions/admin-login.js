import { getAdminUsersCollection } from './lib/db.js'
import { ROLES, hashPassword, verifyPassword, signAdminToken } from './lib/admin-auth.js'

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

/** Usuarios iniciales; si falta alguno en BD se crea con la misma contraseña por defecto. */
const SEED_USERS = [
  { username: 'admin', role: 'admin' },
  { username: 'operaciones', role: 'operaciones' },
  { username: 'comercial', role: 'comercial' },
  { username: 'adminpruebas', role: 'admin' },
]

async function ensureSeedUsers() {
  const col = await getAdminUsersCollection()
  const defaultPass = 'bolera2026'
  const passwordHash = await hashPassword(defaultPass)

  for (const { username, role } of SEED_USERS) {
    const exists = await col.findOne({ username })
    if (!exists) {
      await col.insertOne({
        username,
        role,
        passwordHash,
        createdAt: new Date(),
        seeded: true,
      })
    }
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { 'Content-Type': 'application/json' } }
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  try {
    await ensureSeedUsers()
    const body = JSON.parse(event.body || '{}')
    const username = String(body.username || '').trim().toLowerCase()
    const password = String(body.password || '')
    if (!username || !password) return json(400, { error: 'username y password son requeridos' })

    const col = await getAdminUsersCollection()
    const user = await col.findOne({ username })
    if (!user) return json(401, { error: 'Credenciales inválidas' })

    // Bootstrap: permitir recuperar acceso con contraseña maestra desde variables de entorno
    // (solo si está configurada y solo para el usuario admin).
    const master = process.env.ADMIN_MASTER_PASSWORD
    if (master && username === 'admin' && password === String(master)) {
      // Si se usa la maestra, dejamos al admin con esa misma contraseña (hash) y autenticamos.
      const passwordHash = await hashPassword(password)
      await col.updateOne(
        { username: 'admin' },
        { $set: { passwordHash, updatedAt: new Date(), updatedBy: 'bootstrap' } }
      )
    } else {
      const ok = await verifyPassword(password, user.passwordHash)
      if (!ok) return json(401, { error: 'Credenciales inválidas' })
    }

    const roleInfo = ROLES[user.role]
    const token = signAdminToken({ username: user.username, role: user.role })

    return json(200, {
      token,
      user: { username: user.username, role: user.role, roleLabel: roleInfo?.label || user.role, permissions: roleInfo?.permissions || [] },
    })
  } catch (err) {
    console.error('[AdminLogin]', err.message)
    return json(500, { error: err.message })
  }
}

