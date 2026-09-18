const E164_PHONE_RE = /^\+[1-9]\d{7,14}$/
const COLOMBIA_PHONE_RE = /^\+57(?:3\d{9}|60[1-8]\d{7})$/
const ALLOWED_PHONE_INPUT_RE = /^[+\d\s().-]+$/

export const CONTACT_PHONE_MAX_LENGTH = 32

function normalizedText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Normaliza teléfonos a E.164. Para Colombia acepta también el número nacional
 * de 10 dígitos y agrega +57. Los formatos internacionales deben incluir + o 00.
 */
export function normalizeContactPhone(value) {
  const text = normalizedText(value)
  if (!text) return ''

  let compact = text.replace(/[\s().-]/g, '')
  if (compact.startsWith('00')) compact = `+${compact.slice(2)}`
  else if (/^57\d{10}$/.test(compact)) compact = `+${compact}`
  else if (/^(?:3\d{9}|60[1-8]\d{7})$/.test(compact)) compact = `+57${compact}`

  return compact
}

/** Devuelve un mensaje de error o cadena vacía si el teléfono es válido/opcional. */
export function validateContactPhone(value) {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value !== 'string') return 'El teléfono debe ser texto.'

  const text = value.trim()
  if (!text) return ''
  if (text.length > CONTACT_PHONE_MAX_LENGTH || !ALLOWED_PHONE_INPUT_RE.test(text)) {
    return 'Escribe un teléfono válido, por ejemplo +57 300 123 4567.'
  }

  const normalized = normalizeContactPhone(text)
  if (!E164_PHONE_RE.test(normalized)) {
    return 'Incluye el indicativo del país, por ejemplo +57 300 123 4567.'
  }
  if (normalized.startsWith('+57') && !COLOMBIA_PHONE_RE.test(normalized)) {
    return 'Escribe un teléfono colombiano válido.'
  }

  return ''
}

export function buildContactPayload(form = {}) {
  return {
    ...form,
    nombre: normalizedText(form.nombre),
    apellido: normalizedText(form.apellido),
    email: normalizedText(form.email),
    telefono: normalizeContactPhone(form.telefono),
    asunto: normalizedText(form.asunto),
    mensaje: normalizedText(form.mensaje),
    terminosAceptados: form.terminosAceptados === true,
    _honey: normalizedText(form._honey),
  }
}
