/**
 * Gestión del consentimiento de cookies y Google Consent Mode v2.
 *
 * Persiste las preferencias del usuario en localStorage y sincroniza las
 * señales de consentimiento con Google (gtag/dataLayer), además de reportar
 * el evento a la API interna sin bloquear la interfaz.
 */

export const STORAGE_KEY = 'ilb_cookie_consent_v1'
export const POLICY_VERSION = '2026-v1'
export const OPEN_BANNER_EVENT = 'ilb:open-consent-banner'
const CONSENT_ENDPOINT = '/api/consent'

function isBrowser() {
  return typeof window !== 'undefined'
}

function generateUuid() {
  if (isBrowser() && typeof window.crypto?.randomUUID === 'function') {
    return window.crypto.randomUUID()
  }

  // Fallback pseudo-aleatorio (uuid v4 aproximado) para navegadores sin randomUUID.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16)
    const value = character === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

function isValidConsent(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  if (value.policyVersion !== POLICY_VERSION) return false
  if (!value.categories || typeof value.categories !== 'object' || Array.isArray(value.categories)) return false
  if (typeof value.categories.necessary !== 'boolean') return false
  if (typeof value.categories.analytics !== 'boolean') return false
  return true
}

/**
 * Lee el consentimiento almacenado. Devuelve `null` si no existe, está
 * corrupto o su versión de política no coincide con la vigente.
 */
export function getStoredConsent() {
  if (!isBrowser()) return null

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!isValidConsent(parsed)) {
      window.localStorage.removeItem(STORAGE_KEY)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function resolveConsentUuid() {
  const stored = getStoredConsent()
  if (stored && typeof stored.consentUuid === 'string' && stored.consentUuid) {
    return stored.consentUuid
  }
  return generateUuid()
}

function reportConsent(payload) {
  const body = JSON.stringify(payload)

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' })
      if (navigator.sendBeacon(CONSENT_ENDPOINT, blob)) return
    }
  } catch {
    // Continúa con fetch si sendBeacon no está disponible.
  }

  try {
    fetch(CONSENT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // El reporte es best-effort: nunca debe romper la interfaz.
  }
}

/**
 * Guarda la decisión del usuario, actualiza Consent Mode y notifica a la API.
 *
 * @param {{ analytics?: boolean, actionType?: string }} options
 * @returns {object|null} el registro persistido o `null` fuera del navegador.
 */
export function saveConsent({ analytics, actionType } = {}) {
  if (!isBrowser()) return null

  const analyticsGranted = Boolean(analytics)
  const consentUuid = resolveConsentUuid()
  const record = {
    consentUuid,
    categories: {
      necessary: true,
      analytics: analyticsGranted,
    },
    actionType: typeof actionType === 'string' && actionType ? actionType : 'update',
    policyVersion: POLICY_VERSION,
    timestamp: new Date().toISOString(),
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  } catch {
    // Almacenamiento no disponible (modo privado, cuota): seguimos con las señales.
  }

  window.gtag?.('consent', 'update', {
    analytics_storage: analyticsGranted ? 'granted' : 'denied',
  })

  window.dataLayer?.push({
    event: 'cookie_consent_updated',
    consent_action: record.actionType,
    consent_analytics: analyticsGranted,
  })

  reportConsent({
    consentUuid,
    necessary: true,
    analytics: analyticsGranted,
    actionType: record.actionType,
    policyVersion: POLICY_VERSION,
  })

  return record
}

/**
 * Solicita la reapertura del banner desde cualquier punto de la aplicación
 * (por ejemplo, la página de política de cookies).
 */
export function openConsentBanner() {
  if (!isBrowser()) return
  window.dispatchEvent(new CustomEvent(OPEN_BANNER_EVENT))
}
