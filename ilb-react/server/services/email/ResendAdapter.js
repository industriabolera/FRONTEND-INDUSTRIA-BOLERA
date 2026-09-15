/* global process */

import { createHash } from 'node:crypto'
import { EmailService } from './EmailService.js'

const RESEND_EMAILS_URL = 'https://api.resend.com/emails'
const RESEND_REQUEST_TIMEOUT_MS = 10000
const IDEMPOTENCY_KEY_MAX_LENGTH = 256

function hashValue(value) {
  return createHash('sha256').update(value).digest('hex')
}

export function buildIdempotencyKey({ idempotencyKey, payload } = {}) {
  const explicitKey = typeof idempotencyKey === 'string' ? idempotencyKey.trim() : ''
  if (/[\r\n]/.test(explicitKey)) throw new Error('Idempotency-Key inválido')
  if (explicitKey) {
    return explicitKey.length <= IDEMPOTENCY_KEY_MAX_LENGTH
      ? explicitKey
      : `email/${hashValue(explicitKey)}`
  }

  return `email/${hashValue(JSON.stringify(payload || {}))}`
}

export class ResendAdapter extends EmailService {
  constructor({ apiKey, fetchImpl, timeoutMs } = {}) {
    super()
    this.apiKey = apiKey
    this.fetchImpl = fetchImpl
    this.timeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : RESEND_REQUEST_TIMEOUT_MS
  }

  async send({ to, from, subject, html, text, replyTo, idempotencyKey } = {}) {
    const apiKey = String(this.apiKey || process.env.RESEND_API_KEY || '').trim()
    if (!apiKey) throw new Error('RESEND_API_KEY no está configurada')

    const fetchImpl = this.fetchImpl || globalThis.fetch
    if (typeof fetchImpl !== 'function') {
      throw new Error('globalThis.fetch no está disponible en este runtime')
    }

    const payload = {
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      ...(html ? { html } : {}),
      ...(text ? { text } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
    }
    const stableIdempotencyKey = buildIdempotencyKey({ idempotencyKey, payload })
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    timeout.unref?.()

    try {
      let response
      try {
        response = await fetchImpl(RESEND_EMAILS_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': stableIdempotencyKey,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })
      } catch (error) {
        if (controller.signal.aborted || error?.name === 'AbortError') {
          throw new Error('Resend agotó el tiempo de espera')
        }
        throw new Error('No se pudo conectar con Resend')
      }

      let responseBody = null
      if (typeof response?.json === 'function') {
        try {
          responseBody = await response.json()
        } catch {
          if (controller.signal.aborted) throw new Error('Resend agotó el tiempo de espera')
        }
      }

      if (!response?.ok) {
        const status = Number.isInteger(response?.status) ? `HTTP ${response.status}` : 'respuesta inválida'
        throw new Error(`Resend rechazó el email (${status})`)
      }

      return {
        id: typeof responseBody?.id === 'string' ? responseBody.id : null,
      }
    } finally {
      clearTimeout(timeout)
    }
  }
}

export default ResendAdapter
