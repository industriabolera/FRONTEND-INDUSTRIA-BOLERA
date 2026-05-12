import { createHash, randomBytes } from 'crypto'

const SANDBOX_URL = 'https://checkout-test.placetopay.com'
const PRODUCTION_URL = 'https://checkout.placetopay.com'

function getBaseUrl() {
  return process.env.PLACETOPAY_ENV === 'production' ? PRODUCTION_URL : SANDBOX_URL
}

function generateAuth() {
  const login = process.env.PLACETOPAY_LOGIN
  const secretKey = process.env.PLACETOPAY_TRANKEY

  if (!login || !secretKey) {
    throw new Error('PLACETOPAY_LOGIN and PLACETOPAY_TRANKEY must be set in environment variables')
  }

  const rawNonce = randomBytes(16)
  const seed = new Date().toISOString()

  // Base64(SHA-256(rawNonce + seed + secretKey))
  const tranKey = createHash('sha256')
    .update(rawNonce)
    .update(seed)
    .update(secretKey)
    .digest('base64')

  return {
    login,
    tranKey,
    nonce: rawNonce.toString('base64'),
    seed,
  }
}

async function safeFetch(url, options) {
  const res = await fetch(url, options)
  const text = await res.text()

  let data
  try {
    data = JSON.parse(text)
  } catch {
    console.error(`[PlaceToPay] Non-JSON response from ${url} (${res.status}):`, text.substring(0, 300))
    throw new Error(`PlaceToPay returned non-JSON response (HTTP ${res.status}). Check credentials and URL.`)
  }

  return { res, data }
}

export async function createSession({ reference, description, total, currency = 'COP', returnUrl, cancelUrl, notificationUrl, ipAddress, userAgent, buyer, expiration, fields }) {
  const url = `${getBaseUrl()}/api/session`

  const body = {
    locale: 'es_CO',
    auth: generateAuth(),
    payment: {
      reference,
      description,
      amount: { currency, total },
    },
    // Default: 30 minutos (certificación PlaceToPay). El comercio puede enviar 10, 20 o 30 min.
    expiration: expiration || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    returnUrl,
    cancelUrl,
    ipAddress: ipAddress || '127.0.0.1',
    userAgent: userAgent || 'ILB Reservas',
    skipResult: false,
  }

  if (buyer) body.buyer = buyer
  if (fields && fields.length > 0) body.fields = fields
  if (notificationUrl) body.payment.notificationUrl = notificationUrl

  const { res, data } = await safeFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok || data.status?.status === 'FAILED') {
    throw new Error(data.status?.message || `PlaceToPay error: ${res.status}`)
  }

  return {
    requestId: data.requestId,
    processUrl: data.processUrl,
    status: data.status,
  }
}

export async function querySession(requestId) {
  const url = `${getBaseUrl()}/api/session/${requestId}`

  const { data } = await safeFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auth: generateAuth() }),
  })

  return {
    requestId: data.requestId,
    status: data.status,
    request: data.request,
    payment: data.payment,
  }
}
