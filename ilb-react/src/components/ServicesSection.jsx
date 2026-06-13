import './ServicesSection.css'
import { MENU_PDF_URL } from '../constants/menuPdf'

const services = [
  {
    id: 'strikes',
    title1: '¿QUÉ TAL UNOS',
    title2: 'strikes?',
    description: <>Nuestras <span style={{ color: '#e68007' }}>pistas de bolos</span> están listas para ti.</>,
    buttonText: '¡RESERVA YA!',
    buttonLink: '/reservas#reservar',
  },
  {
    id: 'menu',
    title1: 'NUESTRO',
    title2: 'menú',
    description: <>¿Y qué tal una <span style={{ color: '#e68007' }}>picadita para compartir?</span>, anímate.</>,
    buttonText: 'VER MENÚ',
    buttonLink: MENU_PDF_URL,
    buttonTarget: '_blank',
  },
  {
    id: 'celebraciones',
    title1: '¿Y SI CELEBRAS',
    title2: 'con nosotros?',
    description: <>Estamos preparados para todo tipo de <span style={{ color: '#e68007' }}>celebraciones.</span></>,
    buttonText: 'CONTÁCTANOS',
    buttonLink: 'https://wa.me/573106418808',
    buttonTarget: '_blank',
  },
]

export default function ServicesSection() {
  return (
    <>
      <section className="services-spacer">
        <div className="services-spacer-overlay" />
        <div className="services-spacer-inner" />
      </section>

      <section className="services-section">
        {services.map((service) => (
          <div key={service.id} className={`service-card service-${service.id}`}>
            <div className="service-card-inner">
              <div className="service-spacer-top" />
              <p className="service-title1">{service.title1}</p>
              <p className="service-title2">{service.title2}</p>
              <p className="service-description">{service.description}</p>
              <div className="service-cta">
                <a
                  className="elementor-button elementor-animation-grow"
                  href={service.buttonLink}
                  {...(service.buttonTarget
                    ? { target: service.buttonTarget, rel: 'noopener noreferrer' }
                    : service.buttonLink?.startsWith('http')
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                >
                  {service.buttonText}
                </a>
              </div>
              <div className="service-spacer-bottom" />
            </div>
          </div>
        ))}
      </section>
    </>
  )
}
