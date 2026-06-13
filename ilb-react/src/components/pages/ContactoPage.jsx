import { useCallback } from 'react'
import './PageShell.css'
import './StaticSitePages.css'

const MAIL_TO = 'info@laindustriabolera.co'
const LOCATION_LINES = ['Carrera 70 # 1 – 141, Local 453', '', 'Arkadia Centro Comercial', '', 'Medellín, Antioquia']

export default function ContactoPage() {
  const submitMailto = useCallback((event) => {
    event.preventDefault()
    const form = event.target
    const fd = new FormData(form)
    const nombre = (fd.get('nombre') ?? '').toString().trim()
    const apellido = (fd.get('apellido') ?? '').toString().trim()
    const email = (fd.get('email') ?? '').toString().trim()
    const asunto = (fd.get('asunto') ?? '').toString().trim()
    const mensaje = (fd.get('mensaje') ?? '').toString().trim()
    const body = [
      `Nombre: ${nombre} ${apellido}`,
      `Email: ${email}`,
      '',
      mensaje,
    ].join('\n')
    const href = `mailto:${MAIL_TO}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(body)}`
    window.location.href = href
  }, [])

  return (
    <section className="page-shell">
      <div className="page-shell-bg" />
      <div className="page-shell-container">
        <div className="page-shell-body static-page-contact">
          <div className="static-split">
            <div className="static-col-intro">
              <img
                className="hero-brand"
                src="/images/ColoresHead_Bolera.png"
                width={415}
                height={178}
                alt="La Industria Bolera"
              />
              <h2 className="page-shell-title" style={{ marginBottom: 6 }}>
                FABRICAMOS
              </h2>
              <h2 className="page-shell-title" style={{ marginTop: 0 }}>
                DIVERSIÓN
              </h2>
              <p className="page-shell-subtitle" style={{ marginTop: 18, whiteSpace: 'pre-line' }}>
                {LOCATION_LINES.join('\n')}
              </p>
              <div className="static-contact-social" aria-label="Redes sociales">
                <a href="https://wa.me/573106418808" target="_blank" rel="noopener noreferrer" title="WhatsApp">
                  <i className="fab fa-whatsapp" aria-hidden />
                </a>
                <a href="https://www.instagram.com/laindustriabolera/" target="_blank" rel="noopener noreferrer" title="Instagram">
                  <i className="fab fa-instagram" aria-hidden />
                </a>
              </div>
            </div>
            <div className="static-contact-form-wrap">
              <h2 className="page-shell-title" style={{ fontSize: 'clamp(22px,3vw,32px)', textAlign: 'center', marginBottom: 12 }}>
                ¿TIENES ALGUNA DUDA O QUEJA?
              </h2>
              <h3 className="page-shell-title" style={{ fontSize: 'clamp(20px,2.8vw,28px)', textAlign: 'center', marginTop: 0 }}>
                CONTÁCTANOS
              </h3>
              <p className="page-shell-subtitle" style={{ marginBottom: 22 }}>
                Te responderemos en lo más rápido posible.
              </p>
              <form className="static-form-root" noValidate onSubmit={submitMailto}>
                <div className="static-form-grid">
                  <div className="static-field">
                    <label className="visually-hidden" htmlFor="contacto-nombre">Nombre</label>
                    <input id="contacto-nombre" name="nombre" type="text" autoComplete="given-name" placeholder="Nombre" />
                  </div>
                  <div className="static-field">
                    <label className="visually-hidden" htmlFor="contacto-apellido">Apellido</label>
                    <input id="contacto-apellido" name="apellido" type="text" autoComplete="family-name" placeholder="Apellido" />
                  </div>
                  <div className="static-field full">
                    <label className="visually-hidden" htmlFor="contacto-email">Email</label>
                    <input id="contacto-email" name="email" type="email" autoComplete="email" placeholder="Email" required aria-required />
                  </div>
                  <div className="static-field full">
                    <label className="visually-hidden" htmlFor="contacto-asunto">Asunto</label>
                    <input id="contacto-asunto" name="asunto" type="text" placeholder="Asunto" required aria-required />
                  </div>
                  <div className="static-field full">
                    <label className="visually-hidden" htmlFor="contacto-mensaje">Mensaje</label>
                    <textarea id="contacto-mensaje" name="mensaje" rows={4} placeholder="Mensaje" />
                  </div>
                  <button className="static-form-submit full" type="submit">
                    ENVIAR
                  </button>
                </div>
              </form>
              <p className="static-form-hint">
                También puedes escribir por WhatsApp: (57) 3106418808 — {MAIL_TO}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
