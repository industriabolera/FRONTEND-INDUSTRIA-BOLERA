/* global process */

import express from 'express'
import { insertContactMessage, updateEmailStatus } from '../db/mysql.js'
import emailService from '../services/email/index.js'
import { buildContactEmailContent } from '../services/email/contactEmail.js'
import { hasHoneypotValue, validateContact } from '../validators/contactValidator.js'

const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const rateLimitStore = new Map()

const contactRouter = express.Router()

function getClientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown'
}

function cleanupRateLimitStore(now) {
  for (const [ip, entry] of rateLimitStore) {
    if (entry.resetAt <= now) rateLimitStore.delete(ip)
  }
}

function isRateLimited(ip, now = Date.now()) {
  cleanupRateLimitStore(now)

  const current = rateLimitStore.get(ip)
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  if (current.count >= RATE_LIMIT_MAX) return true
  current.count += 1
  return false
}

function getConfiguredEmailAddresses() {
  const from = typeof process.env.CONTACT_FROM_EMAIL === 'string'
    ? process.env.CONTACT_FROM_EMAIL.trim()
    : ''
  const to = typeof process.env.CONTACT_TO_EMAIL === 'string'
    ? process.env.CONTACT_TO_EMAIL.trim()
    : ''

  return { from, to }
}

function sanitizeEmailError(error) {
  return String(error?.message || error || 'Error desconocido')
    .replace(/[\r\n]+/g, ' ')
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [redacted]')
    .replace(/\bre_[A-Za-z0-9_-]+\b/gi, '[redacted]')
    .replace(/(password|passwd|pwd|secret|token|api[-_ ]?key)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .slice(0, 240)
}

contactRouter.post('/', async (req, res) => {
  const body = req.body || {}

  if (hasHoneypotValue(body?._honey) || hasHoneypotValue(body?.website)) {
    return res.status(200).end()
  }

  const ip = getClientIp(req)
  if (isRateLimited(ip)) {
    res.set('Retry-After', String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)))
    return res.status(429).json({ error: 'Demasiadas solicitudes. Intenta más tarde.' })
  }

  const validation = validateContact(body)
  if (!validation.valid) {
    return res.status(400).json({ success: false, errors: validation.errors })
  }

  try {
    const contactId = await insertContactMessage({
      ...validation.data,
      ipAddress: ip,
    })

    if (!contactId) {
      return res.status(503).json({
        success: false,
        error: 'No fue posible guardar el mensaje. Intenta más tarde.',
      })
    }

    const { from, to } = getConfiguredEmailAddresses()
    if (!from || !to) {
      const errorMessage = 'CONTACT_FROM_EMAIL y CONTACT_TO_EMAIL deben estar configuradas.'
      console.error(`[Contact] Email omitido para mensaje ${contactId}: configuración incompleta`)
      await updateEmailStatus(contactId, { status: 'failed', error: errorMessage })
    } else {
      const emailContent = buildContactEmailContent(validation.data)
      try {
        const emailResult = await emailService.send({
          to,
          from,
          replyTo: validation.data.email,
          idempotencyKey: `contact-message/${contactId}`,
          ...emailContent,
        })

        await updateEmailStatus(contactId, {
          status: 'sent',
          emailId: emailResult?.id,
        })
      } catch (error) {
        const safeError = sanitizeEmailError(error)
        console.error(`[Contact] No se pudo enviar el email del mensaje ${contactId}: ${safeError}`)
        await updateEmailStatus(contactId, {
          status: 'failed',
          error: safeError,
        })
      }
    }

    return res.status(200).json({ success: true, message: 'Mensaje recibido con éxito' })
  } catch (error) {
    console.error(`[Contact] Error procesando mensaje: ${sanitizeEmailError(error)}`)
    return res.status(500).json({
      success: false,
      error: 'No fue posible procesar el mensaje.',
    })
  }
})

export { contactRouter }
export default contactRouter
