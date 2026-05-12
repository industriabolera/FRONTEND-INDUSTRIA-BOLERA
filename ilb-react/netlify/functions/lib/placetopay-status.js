const FINAL_SESSION_STATUSES = new Set([
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'APPROVED_PARTIAL',
  'PARTIAL_EXPIRED',
])

function mapPlaceToPayStatusToEstado(status) {
  if (status === 'APPROVED' || status === 'APPROVED_PARTIAL') return 'exitosa'
  if (status === 'REJECTED' || status === 'PARTIAL_EXPIRED') return 'rechazada'
  if (status === 'CANCELLED') return 'cancelada'
  return 'pendiente'
}

function extractPaymentStatuses(payment) {
  if (!payment) return []
  const entries = Array.isArray(payment) ? payment : [payment]
  return entries.map(entry => entry?.status?.status).filter(Boolean)
}

export function resolveSessionEstado(result, { notificationStatus } = {}) {
  const sessionStatus = result?.status?.status
  const statusMessage = result?.status?.message
  const paymentStatuses = extractPaymentStatuses(result?.payment)

  if (notificationStatus && FINAL_SESSION_STATUSES.has(notificationStatus)) {
    return {
      estado: mapPlaceToPayStatusToEstado(notificationStatus),
      sessionStatus: notificationStatus,
      statusMessage,
    }
  }

  if (sessionStatus && sessionStatus !== 'PENDING') {
    return {
      estado: mapPlaceToPayStatusToEstado(sessionStatus),
      sessionStatus,
      statusMessage,
    }
  }

  if (paymentStatuses.includes('APPROVED')) {
    return {
      estado: 'exitosa',
      sessionStatus: 'APPROVED',
      statusMessage,
    }
  }

  return {
    estado: 'pendiente',
    sessionStatus: sessionStatus || 'PENDING',
    statusMessage,
  }
}
