import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { isProductionEnv } from './http-security.js'

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

export function getJwtSecret() {
  const dedicated = process.env.ADMIN_JWT_SECRET
  if (dedicated) return dedicated
  if (isProductionEnv()) {
    throw new Error('ADMIN_JWT_SECRET is required in production')
  }
  return process.env.PLACETOPAY_TRANKEY || process.env.MONGODB_URI || 'dev-insecure-jwt-secret'
}

export async function hashPassword(password) {
  return await bcrypt.hash(String(password), 10)
}

export async function verifyPassword(password, hash) {
  return await bcrypt.compare(String(password), String(hash))
}

export function signAdminToken(payload, { expiresIn = '12h' } = {}) {
  const secret = getJwtSecret()
  return jwt.sign(payload, secret, { expiresIn, algorithm: 'HS256' })
}

export function verifyAdminToken(token) {
  const secret = getJwtSecret()
  return jwt.verify(token, secret, { algorithms: ['HS256'] })
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
    return {
      ok: true,
      user: {
        username: decoded.username,
        role,
        permissions: perms,
        tokenVersion: decoded.tokenVersion || 0,
      },
    }
  } catch {
    return { ok: false, statusCode: 401, error: 'Token inválido' }
  }
}

/** Valida permisos + versión de token contra BD (invalida sesiones tras cambio de contraseña). */
export async function requireAuthAsync(event, requiredPermissions = [], usersCol) {
  const base = requireAuth(event, requiredPermissions)
  if (!base.ok) return base
  if (!usersCol) return base
  try {
    const user = await usersCol.findOne({ username: base.user.username })
    const dbVersion = user?.tokenVersion || 0
    if (dbVersion !== (base.user.tokenVersion || 0)) {
      return { ok: false, statusCode: 401, error: 'Sesión expirada. Inicia sesión de nuevo.' }
    }
    return base
  } catch {
    return { ok: false, statusCode: 401, error: 'Token inválido' }
  }
}
