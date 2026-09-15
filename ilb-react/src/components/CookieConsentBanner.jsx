import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getStoredConsent, saveConsent, OPEN_BANNER_EVENT } from '../utils/consentManager'
import './CookieConsentBanner.css'

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false
    return getStoredConsent() === null
  })

  useEffect(() => {
    const handleOpen = () => setVisible(true)
    window.addEventListener(OPEN_BANNER_EVENT, handleOpen)
    return () => window.removeEventListener(OPEN_BANNER_EVENT, handleOpen)
  }, [])

  const handleAcceptAll = useCallback(() => {
    saveConsent({ analytics: true, actionType: 'accept_all' })
    setVisible(false)
  }, [])

  const handleRejectOptional = useCallback(() => {
    saveConsent({ analytics: false, actionType: 'reject_optional' })
    setVisible(false)
  }, [])

  if (!visible) return null

  return (
    <div
      className="cookie-consent"
      role="dialog"
      aria-modal="false"
      aria-label="Preferencias de cookies"
    >
      <div className="cookie-consent__inner">
        <div className="cookie-consent__content">
          <p className="cookie-consent__title">Tu privacidad es importante</p>
          <p className="cookie-consent__text">
            En La Industria Bolera utilizamos cookies técnicas esenciales para el funcionamiento del
            sitio y cookies analíticas opcionales para conocer cómo interactúas con nuestra web y
            mejorar nuestros servicios. Puedes aceptarlas todas o continuar solo con las necesarias,
            conforme a la Ley 1581 de 2012 y al Decreto 1377 de 2013.{' '}
            <Link to="/politica-de-cookies" className="cookie-consent__link">
              Conoce más o configura tus cookies
            </Link>
            .
          </p>
        </div>

        <div className="cookie-consent__actions">
          <button
            type="button"
            className="cookie-consent__btn cookie-consent__btn--secondary"
            onClick={handleRejectOptional}
          >
            Solo necesarias
          </button>
          <button
            type="button"
            className="cookie-consent__btn cookie-consent__btn--primary"
            onClick={handleAcceptAll}
          >
            Aceptar todas
          </button>
        </div>
      </div>
    </div>
  )
}
