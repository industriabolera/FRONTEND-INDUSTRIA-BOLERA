import './ServiciosTipsSection.css'

const tips = [
  {
    id: 'zapatos',
    image: '/images/Zapatos.png',
    alt: 'Zapatos',
    text: 'Aquí te cambiaremos de zapatos, por unos especiales que además van con cualquier pinta',
  },
  {
    id: 'ropa',
    image: '/images/RopaComoda.png',
    alt: 'Ropa Cómoda',
    text: 'Lleva ropa cómoda para que puedas dar lo mejor de ti',
  },
  {
    id: 'reserva',
    image: '/images/Reserva.png',
    alt: 'Reserva',
    text: '¡No olvides hacer tu reserva con anterioridad, es mejor tener tu pista segura!',
  },
]

const horarios = [
  { day: 'L', hours: '12m a 10pm' },
  { day: 'M', hours: '12m a 10pm' },
  { day: 'Mi', hours: '12m a 10pm' },
  { day: 'J', hours: '12m a 11pm' },
  { day: 'V', hours: '12m a 11pm' },
  { day: 'S', hours: '12m a 11pm' },
  { day: 'D', hours: '12m a 9pm' },
]

export default function ServiciosTipsSection() {
  return (
    <section className="servicios-tips">
      <div className="servicios-tips-bg" />
      <div className="servicios-tips-container">
        <div className="servicios-tips-logo">
          <img
            src="/images/ColoresHead_Bolera.png"
            alt="La Industria Bolera"
            width="415"
            height="178"
          />
        </div>

        <header className="servicios-tips-heading">
          <h1 className="servicios-tips-title-yellow">VAMOS DE BOWLING</h1>
          <h2 className="servicios-tips-title-cursive">
            lo que debes tener en cuenta
          </h2>
        </header>

        <div className="servicios-tips-cards">
          {tips.map((tip) => (
            <article key={tip.id} className="servicios-tip-card">
              <div className="servicios-tip-circle" aria-hidden="true">
                <span />
              </div>
              <div className="servicios-tip-image">
                <img src={tip.image} alt={tip.alt} loading="lazy" />
              </div>
              <p className="servicios-tip-text">{tip.text}</p>
            </article>
          ))}
        </div>

        <header className="servicios-tips-heading servicios-tips-heading-spacer">
          <h1 className="servicios-tips-title-yellow">NUESTROS</h1>
          <h2 className="servicios-tips-title-cursive">horarios</h2>
        </header>

        <ul className="servicios-horarios">
          {horarios.map((h) => (
            <li key={h.day} className="servicios-horario-item">
              <div className="servicios-horario-circle" aria-hidden="true">
                <span />
              </div>
              <span className="servicios-horario-day">{h.day}</span>
              <span className="servicios-horario-hours">{h.hours}</span>
              <span className="servicios-horario-divider" />
            </li>
          ))}
        </ul>

        <div className="servicios-tips-cta">
          <a
            className="servicios-tips-button"
            href="https://wa.me/573113540008"
            target="_blank"
            rel="noopener noreferrer"
          >
            RESERVA YA
          </a>
        </div>
      </div>
    </section>
  )
}
