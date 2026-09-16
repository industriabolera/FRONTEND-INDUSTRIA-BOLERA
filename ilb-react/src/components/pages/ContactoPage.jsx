import './PageShell.css'
import './StaticSitePages.css'
import ContactForm from '../ContactForm'

const MAIL_TO = 'info@laindustriabolera.co'
const WHATSAPP_HREF = 'https://wa.me/573106418808'
const LOCATION_LINES = ['Carrera 70 # 1 – 141, Local 453', '', 'Arkadia Centro Comercial', '', 'Medellín, Antioquia']

export default function ContactoPage() {
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
              <h1 className="page-shell-title" style={{ marginBottom: 0 }}>
                <span style={{ display: 'block', marginBottom: 6 }}>FABRICAMOS</span>{' '}
                <span style={{ display: 'block', marginTop: 0 }}>DIVERSIÓN</span>
              </h1>
              <p className="page-shell-subtitle" style={{ marginTop: 18, whiteSpace: 'pre-line' }}>
                {LOCATION_LINES.join('\n')}
              </p>
              <p className="page-shell-subtitle" style={{ marginTop: 20, marginBottom: 0 }}>
                <strong style={{ color: '#e4d28d' }}>HORARIOS</strong><br />
                Lunes a miércoles: 2:00 p. m. – 10:00 p. m.<br />
                Jueves y viernes: 2:00 p. m. – 11:00 p. m.<br />
                Sábados: 12:00 m. – 11:00 p. m.<br />
                Domingos: 12:00 m. – 9:00 p. m.
              </p>
              <p className="page-shell-subtitle" style={{ marginTop: 18, marginBottom: 0 }}>
                <strong style={{ color: '#e4d28d' }}>WHATSAPP</strong><br />
                <a href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer">
                  (57) 310 641 8808
                </a><br />
                <strong style={{ color: '#e4d28d' }}>EMAIL</strong><br />
                <a href={`mailto:${MAIL_TO}`}>{MAIL_TO}</a>
              </p>
              <div className="static-contact-social" aria-label="Redes sociales">
                <a href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer" title="WhatsApp">
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
              <ContactForm />
              <p className="static-form-hint">
                También puedes escribir por <a href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer">WhatsApp</a>: (57) 3106418808 — <a href={`mailto:${MAIL_TO}`}>{MAIL_TO}</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
