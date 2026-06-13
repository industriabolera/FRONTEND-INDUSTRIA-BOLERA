import './ServiciosExtrasSection.css'

const extras = [
  {
    id: 'billar',
    image: '/images/Billar.png',
    alt: 'Billar',
    title: 'BILLAR',
    description: '¿Qué mejor complemento para una tarde de diversión?',
    price: 'Valor: 25.000 (Hora)',
  },
  {
    id: 'celebraciones',
    image: '/images/Celebraciones.png',
    alt: 'Celebraciones y eventos empresariales',
    title: 'CELEBRACIONES & EVENTOS EMPRESARIALES',
    description: 'Contáctanos para organizar juntos el parche perfecto.',
    price: null,
  },
  {
    id: 'cabina',
    image: '/images/CabinaFotos.png',
    alt: 'Cabina de fotos',
    title: 'CABINA DE FOTOS',
    description: '¡Captura con tus amigos un momento para el recuerdo!',
    price: 'Valor: 15.000',
  },
]

export default function ServiciosExtrasSection() {
  return (
    <section className="servicios-extras">
      <div className="servicios-extras-bg" />
      <div className="servicios-extras-container">
        <header className="servicios-extras-heading">
          <h2 className="servicios-extras-title-yellow">en esta industria fabricamos</h2>
          <h1 className="servicios-extras-title-yellow servicios-extras-title-big">
            MUCHA DIVERSIÓN
          </h1>
        </header>

        <div className="servicios-extras-grid">
          {extras.map((item) => (
            <article key={item.id} className="servicios-extras-card">
              <div className="servicios-extras-circle" aria-hidden="true">
                <span />
              </div>
              <div className="servicios-extras-image">
                <img src={item.image} alt={item.alt} loading="lazy" />
              </div>
              <h3 className="servicios-extras-card-title">{item.title}</h3>
              <p className="servicios-extras-card-description">{item.description}</p>
              {item.price && (
                <p className="servicios-extras-card-price">{item.price}</p>
              )}
            </article>
          ))}
        </div>

        <div className="servicios-extras-cta">
          <a
            className="servicios-extras-button"
            href="https://wa.me/573106418808"
            target="_blank"
            rel="noopener noreferrer"
          >
            CONTÁCTANOS
          </a>
        </div>
      </div>
    </section>
  )
}
