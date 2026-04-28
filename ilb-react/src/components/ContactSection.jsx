import { useState } from 'react'
import './ContactSection.css'

export default function ContactSection() {
  const [form, setForm] = useState({
    name: '',
    lastName: '',
    email: '',
    subject: '',
    message: '',
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Form submitted:', form)
  }

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
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-fields-wrapper">
                <div className="form-field form-field-half">
                  <input
                    type="text"
                    name="name"
                    placeholder="Nombre"
                    value={form.name}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
                <div className="form-field form-field-half">
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Apellido"
                    value={form.lastName}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
                <div className="form-field form-field-half">
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-field form-field-half">
                  <input
                    type="text"
                    name="subject"
                    placeholder="Asunto"
                    value={form.subject}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-field form-field-full">
                  <textarea
                    name="message"
                    placeholder="Mensaje"
                    value={form.message}
                    onChange={handleChange}
                    className="form-textarea"
                    rows="4"
                  />
                </div>
                <div className="form-field form-field-full form-submit">
                  <button
                    type="submit"
                    className="elementor-button elementor-size-sm form-button"
                  >
                    ENVIAR
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
