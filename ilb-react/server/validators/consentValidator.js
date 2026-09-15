const CONSENT_UUID_RE = /^[A-Za-z0-9-]{10,64}$/
const CONSENT_ACTION_TYPES = ['accept_all', 'reject_optional', 'custom']
const DEFAULT_POLICY_VERSION = '2026-v1'
const POLICY_VERSION_MAX_LENGTH = 50

function normalizedString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function validateConsent(payload) {
  const errors = {}
  const body = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : null

  if (!body) {
    return {
      valid: false,
      errors: { _form: 'El cuerpo de la solicitud no es válido.' },
      data: null,
    }
  }

  const consentUuid = normalizedString(body.consentUuid)
  if (!CONSENT_UUID_RE.test(consentUuid)) {
    errors.consentUuid = 'El consentUuid debe ser alfanumérico (con guiones) entre 10 y 64 caracteres.'
  }

  if (body.necessary !== true) {
    errors.necessary = 'necessary debe ser true.'
  }

  if (typeof body.analytics !== 'boolean') {
    errors.analytics = 'analytics debe ser un valor booleano.'
  }

  const actionType = normalizedString(body.actionType)
  if (!CONSENT_ACTION_TYPES.includes(actionType)) {
    errors.actionType = `actionType debe ser uno de: ${CONSENT_ACTION_TYPES.join(', ')}.`
  }

  let policyVersion = DEFAULT_POLICY_VERSION
  if (body.policyVersion !== undefined && body.policyVersion !== null) {
    if (typeof body.policyVersion !== 'string') {
      errors.policyVersion = 'policyVersion debe ser texto.'
    } else {
      policyVersion = body.policyVersion.trim()
      if (policyVersion.length === 0 || policyVersion.length > POLICY_VERSION_MAX_LENGTH) {
        errors.policyVersion = `policyVersion debe tener entre 1 y ${POLICY_VERSION_MAX_LENGTH} caracteres.`
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data: {
      consentUuid,
      necessary: body.necessary === true,
      analytics: typeof body.analytics === 'boolean' ? body.analytics : false,
      actionType,
      policyVersion,
    },
  }
}

export const consentValidator = validateConsent
export default validateConsent
