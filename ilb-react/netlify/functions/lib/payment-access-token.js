import { createHmac, timingSafeEqual } from 'crypto'

function getSecret() {
  return (
    process.env.PAYMENT_ACCESS_SECRET
    || process.env.ADMIN_JWT_SECRET
    || process.env.PLACETOPAY_TRANKEY
    || process.env.MONGODB_URI
  )
}

export function createPaymentAccessToken(reference, requestId) {
  const secret = getSecret()
  if (!secret) throw new Error('PAYMENT_ACCESS_SECRET is not configured')
  return createHmac('sha256', secret)
    .update(`${String(reference)}:${String(requestId)}`)
    .digest('hex')
}

export function verifyPaymentAccessToken(reference, requestId, token) {
  if (!reference || !requestId || !token) return false
  const expected = createPaymentAccessToken(reference, requestId)
  try {
    const a = Buffer.from(String(token))
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/** Reservas antiguas sin token: permitir solo verify/cancel si aún no tienen paymentAccessToken. */
export function canAccessLegacyPayment(reserva, accessToken) {
  if (accessToken && reserva?.paymentAccessToken) return false
  return !reserva?.paymentAccessToken
}

export function paymentAccessAllowed(reserva, accessToken) {
  if (!reserva) return false
  if (!reserva.paymentAccessToken) return canAccessLegacyPayment(reserva, accessToken)
  if (!accessToken) return false
  return verifyPaymentAccessToken(reserva.reference, reserva.requestId, accessToken)
}
