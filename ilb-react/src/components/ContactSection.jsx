import './ContactSection.css'
import ContactForm from './ContactForm'

export default function ContactSection() {
  return (
    <section className="contact-section">
      <div className="contact-content">
        <div className="contact-inner">
          <div className="contact-info">
            <p className="contact-subtitle">¿TIENES ALGUNA DUDA?</p>
            <h2 className="contact-title">CONTÁCTANOS</h2>
            <h2 className="contact-description">
              Te responderemos en lo más rápido posible.
            </h2>
          </div>

          <div className="contact-form-wrapper">
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  )
}
