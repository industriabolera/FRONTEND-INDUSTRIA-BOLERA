import { normalizeContactPhone, validateContactPhone } from '../../src/utils/contactForm.js'

const EMAIL_LOCAL_PART_RE = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/
const EMAIL_DOMAIN_LABEL = '[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?'
const EMAIL_DOMAIN_RE = new RegExp(`^(?:${EMAIL_DOMAIN_LABEL})(?:\\.${EMAIL_DOMAIN_LABEL})*$`)

function characterLength(value) {
  return Array.from(value).length
}

function normalizedString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function hasHoneypotValue(value) {
  if (value === undefined || value === null) return false
  if (typeof value !== 'string') return true
  return value.trim().length > 0
}

export function isStrictEmail(value) {
  const email = normalizedString(value)
  if (!email || characterLength(email) > 254) return false

  const atIndex = email.lastIndexOf('@')
  if (atIndex <= 0 || atIndex === email.length - 1) return false

  const localPart = email.slice(0, atIndex)
  const domain = email.slice(atIndex + 1)
  if (characterLength(localPart) > 64 || characterLength(domain) > 253) return false

  return EMAIL_LOCAL_PART_RE.test(localPart) && EMAIL_DOMAIN_RE.test(domain)
}

export function validateContact(payload) {
  const errors = {}
  const body = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : null

  if (!body) {
    return {
      valid: false,
      errors: { _form: 'El cuerpo de la solicitud no es válido.' },
      data: null,
    }
  }

  const nombre = normalizedString(body.nombre)
  const apellido = normalizedString(body.apellido)
  const email = normalizedString(body.email)
  const telefono = normalizeContactPhone(body.telefono)
  const asunto = normalizedString(body.asunto)
  const mensaje = normalizedString(body.mensaje)

  if (characterLength(nombre) < 2 || characterLength(nombre) > 100) {
    errors.nombre = 'El nombre debe tener entre 2 y 100 caracteres.'
  }

  if (body.apellido !== undefined && body.apellido !== null && typeof body.apellido !== 'string') {
    errors.apellido = 'El apellido debe ser texto.'
  } else if (characterLength(apellido) > 100) {
    errors.apellido = 'El apellido no puede superar 100 caracteres.'
  }

  if (!isStrictEmail(email)) {
    errors.email = 'El email no tiene un formato válido.'
  }

  const telefonoError = validateContactPhone(body.telefono)
  if (telefonoError) errors.telefono = telefonoError

  if (characterLength(asunto) < 3 || characterLength(asunto) > 150) {
    errors.asunto = 'El asunto debe tener entre 3 y 150 caracteres.'
  }

  if (characterLength(mensaje) < 10 || characterLength(mensaje) > 2000) {
    errors.mensaje = 'El mensaje debe tener entre 10 y 2000 caracteres.'
  }

  if (body.terminosAceptados !== true) {
    errors.terminosAceptados = 'Debes aceptar los términos y condiciones.'
  }

  if (hasHoneypotValue(body._honey)) errors._honey = 'Solicitud inválida.'
  if (hasHoneypotValue(body.website)) errors.website = 'Solicitud inválida.'

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data: {
      nombre,
      apellido: apellido || null,
      email,
      telefono: telefono || null,
      asunto,
      mensaje,
      terminosAceptados: body.terminosAceptados === true,
    },
  }
}

export const contactValidator = validateContact
export default validateContact
