import { getAdminUsersCollection } from './lib/db.js'
import { requireAuth, hashPassword, ROLES } from './lib/admin-auth.js'

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

function publicUser(u) {
  if (!u) return null
  return {
    username: u.username,
    role: u.role,
    roleLabel: ROLES[u.role]?.label || u.role,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { 'Content-Type': 'application/json' } }

  const auth = requireAuth(event, ['users:write'])
  if (!auth.ok) return json(auth.statusCode, { error: auth.error })

  try {
    const col = await getAdminUsersCollection()

    if (event.httpMethod === 'GET') {
      const users = await col.find({}).project({ username: 1, role: 1, createdAt: 1, updatedAt: 1 }).sort({ username: 1 }).toArray()
      return json(200, { users: users.map(publicUser).filter(Boolean) })
    }

    if (event.httpMethod === 'PATCH') {
      const body = JSON.parse(event.body || '{}')
      const username = String(body.username || '').trim().toLowerCase()
      const newPassword = String(body.newPassword || '')
      if (!username || !newPassword) return json(400, { error: 'username y newPassword son requeridos' })
      if (newPassword.length < 8) return json(400, { error: 'La contraseña debe tener mínimo 8 caracteres' })

      const passwordHash = await hashPassword(newPassword)
      const result = await col.findOneAndUpdate(
        { username },
        {
          $set: { passwordHash, updatedAt: new Date(), updatedBy: auth.user.username },
          $inc: { tokenVersion: 1 },
        },
        { returnDocument: 'after' }
      )
      if (!result) return json(404, { error: 'Usuario no encontrado' })
      return json(200, { user: publicUser(result) })
    }

    return json(405, { error: 'Method not allowed' })
  } catch (err) {
    console.error('[AdminUsers]', err.message)
    return json(500, { error: err.message })
  }
}

