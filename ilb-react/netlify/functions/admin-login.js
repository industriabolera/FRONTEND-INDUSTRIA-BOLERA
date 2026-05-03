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
    if (!user) {
      return json(401, { error: 'Usuario no encontrado. Revisa el nombre (sin espacios) o espera a que el sitio esté actualizado.' })
    }

    // Bootstrap: contraseña maestra en env (solo usuarios con rol admin, p. ej. admin y adminpruebas).
    const master = process.env.ADMIN_MASTER_PASSWORD
    const isAdminRole = user.role === 'admin'
    if (master && isAdminRole && password === String(master)) {
      const passwordHash = await hashPassword(password)
      await col.updateOne(
        { username: user.username },
        { $set: { passwordHash, updatedAt: new Date(), updatedBy: 'bootstrap' } }
      )
    } else {
      if (!user.passwordHash) {
        return json(401, { error: 'Usuario sin contraseña configurada. Usa ADMIN_MASTER_PASSWORD en Netlify o restablece desde otro admin.' })
      }
      const ok = await verifyPassword(password, user.passwordHash)
      if (!ok) return json(401, { error: 'Contraseña incorrecta.' })
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

