export function isProductionEnv() {
  return (
    process.env.PLACETOPAY_ENV === 'production'
    || process.env.NODE_ENV === 'production'
    || process.env.CONTEXT === 'production'
  )
}

export function getAllowedOrigins() {
  return new Set([
    process.env.URL,
    process.env.FRONTEND_URL,
    process.env.DEPLOY_PRIME_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:8888',
  ].filter(Boolean))
}

export function getRequestOrigin(event) {
  return event?.headers?.origin || event?.headers?.Origin || ''
}

export function corsHeaders(event, methods = 'GET, POST, OPTIONS') {
  const origin = getRequestOrigin(event)
  const allowed = getAllowedOrigins()
  const allowOrigin = origin && allowed.has(origin) ? origin : (allowed.values().next().value || '*')
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Cron-Secret',
    'Access-Control-Allow-Methods': methods,
    Vary: 'Origin',
  }
}

export function jsonResponse(statusCode, body, event, methods) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(event, methods),
    },
    body: JSON.stringify(body),
  }
}

export function apiErrorMessage(err, fallback = 'Error interno del servidor') {
  if (!isProductionEnv()) return err?.message || fallback
  return fallback
}

export function getClientIp(event) {
  return (
    event?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
    || event?.headers?.['client-ip']
    || '127.0.0.1'
  )
}

const loginAttempts = new Map()

/** @returns {boolean} true if allowed */
export function checkRateLimit(key, { max = 10, windowMs = 60_000 } = {}) {
  const now = Date.now()
  const bucket = loginAttempts.get(key) || { count: 0, resetAt: now + windowMs }
  if (now > bucket.resetAt) {
    bucket.count = 0
    bucket.resetAt = now + windowMs
  }
  bucket.count += 1
  loginAttempts.set(key, bucket)
  return bucket.count <= max
}

export function isAuthorizedCron(event) {
  const secret = process.env.CRON_SECRET
  if (!secret) return !isProductionEnv()
  const header = event?.headers?.['x-cron-secret'] || event?.headers?.['X-Cron-Secret'] || ''
  const bodySecret = (() => {
    try {
      const body = JSON.parse(event?.body || '{}')
      return String(body.cronSecret || '')
    } catch {
      return ''
    }
  })()
  return header === secret || bodySecret === secret
}
