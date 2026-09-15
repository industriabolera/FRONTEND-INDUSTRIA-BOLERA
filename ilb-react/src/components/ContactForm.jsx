import { useState } from 'react'
import { Link } from 'react-router-dom'
import './ContactForm.css'

const INITIAL_FORM = {
  nombre: '',
  apellido: '',
  email: '',
  asunto: '',
  mensaje: '',
  terminosAceptados: false,
  _honey: '',
}

const FIELD_IDS = {
  nombre: 'contact-form-nombre',
  apellido: 'contact-form-apellido',
  email: 'contact-form-email',
  asunto: 'contact-form-asunto',
  mensaje: 'contact-form-mensaje',
  terminosAceptados: 'contact-form-terminos',
}

const WHATSAPP_HREF = 'https://wa.me/573106418808'
const DEFAULT_ERROR_MESSAGE = 'No pudimos enviar tu mensaje en este momento. Revisa tu conexión e inténtalo de nuevo.'

// RFC 5322 dot-atom local part with a DNS-compatible domain.
const RFC_5322_EMAIL_REGEX = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/

function characterLength(value) {
  return Array.from(value).length
}

function normalizedText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function validateField(name, value) {
  const text = normalizedText(value)

  switch (name) {
    case 'nombre':
      if (!text) return 'El nombre es obligatorio.'
      if (characterLength(text) < 2) return 'El nombre debe tener al menos 2 caracteres.'
      if (characterLength(text) > 100) return 'El nombre no puede superar 100 caracteres.'
      return ''
    case 'apellido':
      if (characterLength(text) > 100) return 'El apellido no puede superar 100 caracteres.'
      return ''
    case 'email':
      if (!text) return 'El email es obligatorio.'
      if (characterLength(text) > 254 || !RFC_5322_EMAIL_REGEX.test(text)) {
        return 'Escribe un email válido, por ejemplo nombre@dominio.com.'
      }
      return ''
    case 'asunto':
      if (!text) return 'El asunto es obligatorio.'
      if (characterLength(text) < 3) return 'El asunto debe tener al menos 3 caracteres.'
      if (characterLength(text) > 150) return 'El asunto no puede superar 150 caracteres.'
      return ''
    case 'mensaje':
      if (!text) return 'El mensaje es obligatorio.'
      if (characterLength(text) < 10) return 'El mensaje debe tener al menos 10 caracteres.'
      if (characterLength(text) > 2000) return 'El mensaje no puede superar 2000 caracteres.'
      return ''
    case 'terminosAceptados':
      return value === true ? '' : 'Debes aceptar los Términos y Condiciones para continuar.'
    case '_honey':
      return text ? 'Solicitud inválida.' : ''
    default:
      return ''
  }
}

function validateForm(form) {
  return Object.keys(INITIAL_FORM).reduce((errors, field) => {
    const error = validateField(field, form[field])
    if (error) errors[field] = error
    return errors
  }, {})
}

function extractServerErrors(errors) {
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return {}

  return Object.entries(errors).reduce((fieldErrors, [field, message]) => {
    if (Object.prototype.hasOwnProperty.call(INITIAL_FORM, field) && typeof message === 'string') {
      fieldErrors[field] = message
    }
    return fieldErrors
  }, {})
}

function FieldError({ id, message }) {
  if (!message) return null

  return (
    <p id={id} className="contact-form__error" role="alert">
      {message}
    </p>
  )
}

export default function ContactForm() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [submitError, setSubmitError] = useState('')

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target
    const nextValue = type === 'checkbox' ? checked : value

    setForm((current) => ({ ...current, [name]: nextValue }))
    const fieldError = validateField(name, nextValue)
    setErrors((current) => {
      const nextErrors = { ...current }
      if (fieldError) nextErrors[name] = fieldError
      else delete nextErrors[name]
      return nextErrors
    })

    if (status === 'error') {
      setStatus('idle')
      setSubmitError('')
    }
  }

  const handleBlur = (event) => {
    const { name, type, checked, value } = event.target
    const fieldValue = type === 'checkbox' ? checked : value
    const fieldError = validateField(name, fieldValue)

    setErrors((current) => {
      const nextErrors = { ...current }
      if (fieldError) nextErrors[name] = fieldError
      else delete nextErrors[name]
      return nextErrors
    })
  }

  const resetForm = () => {
    setForm(INITIAL_FORM)
    setErrors({})
    setSubmitError('')
    setStatus('idle')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validationErrors = validateForm(form)
    setErrors(validationErrors)
    setSubmitError('')

    if (Object.keys(validationErrors).length > 0) {
      setStatus('idle')
      return
    }

    const payload = {
      ...form,
      nombre: normalizedText(form.nombre),
      apellido: normalizedText(form.apellido),
      email: normalizedText(form.email),
      asunto: normalizedText(form.asunto),
      mensaje: normalizedText(form.mensaje),
      terminosAceptados: form.terminosAceptados === true,
      _honey: normalizedText(form._honey),
    }

    setStatus('submitting')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      let responseData = {}
      try {
        responseData = await response.json()
      } catch {
        responseData = {}
      }

      if (!response.ok || responseData?.success === false) {
        const serverErrors = extractServerErrors(responseData?.errors)
        if (Object.keys(serverErrors).length > 0) {
          setErrors((current) => ({ ...current, ...serverErrors }))
        }

        const apiError = new Error(responseData?.error || responseData?.errors?._form || DEFAULT_ERROR_MESSAGE)
        apiError.isContactApiError = true
        throw apiError
      }

      setStatus('success')
    } catch (error) {
      const message = error?.isContactApiError && error.message
        ? error.message
        : DEFAULT_ERROR_MESSAGE
      setSubmitError(message)
      setStatus('error')
    }
  }

  const isSubmitting = status === 'submitting'

  if (status === 'success') {
    return (
      <form className="contact-form" onSubmit={handleSubmit} noValidate>
        <div className="contact-form__feedback contact-form__feedback--success" role="status" aria-live="polite">
          <p className="contact-form__feedback-title">
            ¡Mensaje enviado con éxito! Nos pondremos en contacto contigo lo antes posible.
          </p>
          <button className="contact-form__secondary-action" type="button" onClick={resetForm}>
            Enviar otro mensaje
          </button>
        </div>
      </form>
    )
  }

  return (
    <form
      className="contact-form"
      onSubmit={handleSubmit}
      noValidate
      aria-busy={isSubmitting}
    >
      {status === 'error' && (
        <div className="contact-form__feedback contact-form__feedback--error" role="alert" aria-live="assertive">
          <p className="contact-form__feedback-title">No pudimos enviar tu mensaje.</p>
          <p>{submitError || DEFAULT_ERROR_MESSAGE}</p>
          <div className="contact-form__feedback-actions">
            <button className="contact-form__secondary-action" type="button" onClick={() => setStatus('idle')}>
              Intentar de nuevo
            </button>
            <a className="contact-form__whatsapp-link" href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer">
              Escríbenos por WhatsApp
            </a>
          </div>
        </div>
      )}

      <div className="contact-form__fields">
        <div className="contact-form__field">
          <label className="contact-form__label" htmlFor={FIELD_IDS.nombre}>
            Nombre <span className="contact-form__required" aria-hidden="true">*</span>
          </label>
          <input
            className="contact-form__control"
            id={FIELD_IDS.nombre}
            name="nombre"
            type="text"
            autoComplete="given-name"
            placeholder="Escribe tu nombre"
            value={form.nombre}
            onChange={handleChange}
            onBlur={handleBlur}
            minLength={2}
            maxLength={100}
            required
            aria-required="true"
            aria-invalid={Boolean(errors.nombre)}
            aria-describedby={errors.nombre ? `${FIELD_IDS.nombre}-error` : undefined}
            disabled={isSubmitting}
          />
          <FieldError id={`${FIELD_IDS.nombre}-error`} message={errors.nombre} />
        </div>

        <div className="contact-form__field">
          <label className="contact-form__label" htmlFor={FIELD_IDS.apellido}>
            Apellido <span className="contact-form__optional">(opcional)</span>
          </label>
          <input
            className="contact-form__control"
            id={FIELD_IDS.apellido}
            name="apellido"
            type="text"
            autoComplete="family-name"
            placeholder="Escribe tu apellido (opcional)"
            value={form.apellido}
            onChange={handleChange}
            onBlur={handleBlur}
            maxLength={100}
            aria-invalid={Boolean(errors.apellido)}
            aria-describedby={errors.apellido ? `${FIELD_IDS.apellido}-error` : undefined}
            disabled={isSubmitting}
          />
          <FieldError id={`${FIELD_IDS.apellido}-error`} message={errors.apellido} />
        </div>

        <div className="contact-form__field">
          <label className="contact-form__label" htmlFor={FIELD_IDS.email}>
            Email <span className="contact-form__required" aria-hidden="true">*</span>
          </label>
          <input
            className="contact-form__control"
            id={FIELD_IDS.email}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tu@email.com"
            value={form.email}
            onChange={handleChange}
            onBlur={handleBlur}
            maxLength={254}
            required
            aria-required="true"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? `${FIELD_IDS.email}-error` : undefined}
            disabled={isSubmitting}
          />
          <FieldError id={`${FIELD_IDS.email}-error`} message={errors.email} />
        </div>

        <div className="contact-form__field">
          <label className="contact-form__label" htmlFor={FIELD_IDS.asunto}>
            Asunto <span className="contact-form__required" aria-hidden="true">*</span>
          </label>
          <input
            className="contact-form__control"
            id={FIELD_IDS.asunto}
            name="asunto"
            type="text"
            placeholder="¿Sobre qué quieres contactarnos?"
            value={form.asunto}
            onChange={handleChange}
            onBlur={handleBlur}
            minLength={3}
            maxLength={150}
            required
            aria-required="true"
            aria-invalid={Boolean(errors.asunto)}
            aria-describedby={errors.asunto ? `${FIELD_IDS.asunto}-error` : undefined}
            disabled={isSubmitting}
          />
          <FieldError id={`${FIELD_IDS.asunto}-error`} message={errors.asunto} />
        </div>

        <div className="contact-form__field contact-form__field--full">
          <label className="contact-form__label" htmlFor={FIELD_IDS.mensaje}>
            Mensaje <span className="contact-form__required" aria-hidden="true">*</span>
          </label>
          <textarea
            className="contact-form__control contact-form__control--textarea"
            id={FIELD_IDS.mensaje}
            name="mensaje"
            rows={5}
            placeholder="Cuéntanos cómo podemos ayudarte"
            value={form.mensaje}
            onChange={handleChange}
            onBlur={handleBlur}
            minLength={10}
            maxLength={2000}
            required
            aria-required="true"
            aria-invalid={Boolean(errors.mensaje)}
            aria-describedby={errors.mensaje ? `${FIELD_IDS.mensaje}-error` : undefined}
            disabled={isSubmitting}
          />
          <FieldError id={`${FIELD_IDS.mensaje}-error`} message={errors.mensaje} />
        </div>

        <div className="contact-form__field contact-form__field--full contact-form__field--legal">
          <label className="contact-form__checkbox-label" htmlFor={FIELD_IDS.terminosAceptados}>
            <input
              className="contact-form__checkbox"
              id={FIELD_IDS.terminosAceptados}
              name="terminosAceptados"
              type="checkbox"
              checked={form.terminosAceptados}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              aria-required="true"
              aria-invalid={Boolean(errors.terminosAceptados)}
              aria-describedby={errors.terminosAceptados ? `${FIELD_IDS.terminosAceptados}-error` : undefined}
              disabled={isSubmitting}
            />
            <span>
              Acepto los{' '}
              <Link
                to="/terminos-y-condiciones"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                Términos y Condiciones
              </Link>{' '}
              y autorizo el tratamiento de mis datos personales de acuerdo con la{' '}
              <Link
                to="/politica-de-privacidad"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                Política de Privacidad
              </Link>{' '}
              para ser contactado sobre mi solicitud.
            </span>
          </label>
          <FieldError id={`${FIELD_IDS.terminosAceptados}-error`} message={errors.terminosAceptados} />
        </div>

        <div className="contact-form__field contact-form__field--full contact-form__actions">
          <button className="contact-form__submit" type="submit" disabled={isSubmitting}>
            {isSubmitting && <span className="contact-form__spinner" aria-hidden="true" />}
            {isSubmitting ? 'Enviando mensaje...' : 'Enviar mensaje'}
          </button>
        </div>
      </div>

      <input
        name="_honey"
        type="text"
        value={form._honey}
        onChange={handleChange}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-10000px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      />
    </form>
  )
}
