/* global process */

import { EmailService } from './EmailService.js'

const RESEND_EMAILS_URL = 'https://api.resend.com/emails'

export class ResendAdapter extends EmailService {
  constructor({ apiKey, fetchImpl } = {}) {
    super()
    this.apiKey = apiKey
    this.fetchImpl = fetchImpl
  }

  async send({ to, from, subject, html, text, replyTo } = {}) {
    const apiKey = this.apiKey || process.env.RESEND_API_KEY
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

    const response = await fetchImpl(RESEND_EMAILS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    let responseBody = null
    try {
      responseBody = await response.json()
    } catch {
      responseBody = null
    }

    if (!response.ok) {
      const providerMessage = responseBody?.message || responseBody?.error || `HTTP ${response.status}`
      throw new Error(`Resend rechazó el email: ${providerMessage}`)
    }

    return {
      id: typeof responseBody?.id === 'string' ? responseBody.id : null,
    }
  }
}

export default ResendAdapter
