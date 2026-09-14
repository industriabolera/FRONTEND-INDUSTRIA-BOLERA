/* global process */

import express from 'express'
import { insertContactMessage, updateEmailStatus } from '../db/mysql.js'
import emailService from '../services/email/index.js'
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

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return entities[character]
  })
}

function buildEmailContent(data) {
  const fullName = [data.nombre, data.apellido].filter(Boolean).join(' ')
  const subject = `Nuevo mensaje de contacto: ${data.asunto.replace(/[\r\n]+/g, ' ')}`
  const text = [
    `Nombre: ${fullName}`,
    `Email: ${data.email}`,
    `Asunto: ${data.asunto}`,
    '',
    data.mensaje,
    '',
    'Términos aceptados: Sí',
  ].join('\n')
  const html = `
    <h2>Nuevo mensaje de contacto</h2>
    <p><strong>Nombre:</strong> ${escapeHtml(fullName)}</p>
    <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
    <p><strong>Asunto:</strong> ${escapeHtml(data.asunto)}</p>
    <p><strong>Mensaje:</strong></p>
    <p>${escapeHtml(data.mensaje).replace(/\n/g, '<br>')}</p>
    <p><strong>Términos aceptados:</strong> Sí</p>
  `

  return { subject, text, html }
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

    const emailContent = buildEmailContent(validation.data)
    try {
      const emailResult = await emailService.send({
        to: process.env.CONTACT_TO_EMAIL || 'modocreativosjo@gmail.com',
        from: process.env.CONTACT_FROM_EMAIL || 'hola@sadamy.com',
        replyTo: validation.data.email,
        ...emailContent,
      })

      await updateEmailStatus(contactId, {
        status: 'sent',
        emailId: emailResult?.id,
      })
    } catch (error) {
      console.error(`[Contact] No se pudo enviar el email del mensaje ${contactId}: ${error?.message || 'Error desconocido'}`)
      await updateEmailStatus(contactId, {
        status: 'failed',
        error: error?.message || 'Error desconocido',
      })
    }

    return res.status(200).json({ success: true, message: 'Mensaje recibido con éxito' })
  } catch (error) {
    console.error(`[Contact] Error procesando mensaje: ${error?.message || 'Error desconocido'}`)
    return res.status(500).json({
      success: false,
      error: 'No fue posible procesar el mensaje.',
    })
  }
})

export { contactRouter }
export default contactRouter
