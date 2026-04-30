import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.PLACETOPAY_TRANKEY || process.env.MONGODB_URI

export const ROLES = {
  admin: {
    label: 'Admin',
    permissions: ['reservas:read', 'reservas:write', 'pistas:read', 'pistas:write', 'config:read', 'config:write', 'users:write'],
  },
  operaciones: {
    label: 'Operaciones',
    permissions: ['reservas:read', 'reservas:write', 'pistas:read', 'pistas:write', 'config:read'],
  },
  comercial: {
    label: 'Comercial',
    permissions: ['config:read', 'config:write'],
  },
}

export async function hashPassword(password) {
  return await bcrypt.hash(String(password), 10)
}

export async function verifyPassword(password, hash) {
  return await bcrypt.compare(String(password), String(hash))
}

export function signAdminToken(payload, { expiresIn = '12h' } = {}) {
  if (!JWT_SECRET) throw new Error('ADMIN_JWT_SECRET is not set')
  return jwt.sign(payload, JWT_SECRET, { expiresIn })
}

export function verifyAdminToken(token) {
  if (!JWT_SECRET) throw new Error('ADMIN_JWT_SECRET is not set')
  return jwt.verify(token, JWT_SECRET)
}

export function getBearerToken(event) {
  const auth = event.headers?.authorization || event.headers?.Authorization || ''
  const m = String(auth).match(/^Bearer\s+(.+)$/i)
  return m ? m[1].trim() : ''
}

export function requireAuth(event, requiredPermissions = []) {
  const token = getBearerToken(event)
  if (!token) return { ok: false, statusCode: 401, error: 'No autorizado' }
  try {
    const decoded = verifyAdminToken(token)
    const role = decoded?.role
    const roleInfo = ROLES[role]
    const perms = roleInfo?.permissions || []
    const hasAll = requiredPermissions.every(p => perms.includes(p))
    if (!hasAll) return { ok: false, statusCode: 403, error: 'Sin permisos' }
    return { ok: true, user: { username: decoded.username, role, permissions: perms } }
  } catch {
    return { ok: false, statusCode: 401, error: 'Token inválido' }
  }
}

