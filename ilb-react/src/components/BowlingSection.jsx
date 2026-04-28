import './BowlingSection.css'

const tags = [
  { text: '+ Bowling', className: 'bowling-tag-bowling' },
  { text: '+ Billar', className: 'bowling-tag-billar' },
  { text: '+ Comidas', className: 'bowling-tag-comidas' },
  { text: '+ Risas', className: 'bowling-tag-risas' },
]

export default function BowlingSection() {
  return (
    <section className="bowling-section">
      <div className="bowling-overlay" />
      <div className="bowling-container">
        <div className="bowling-left">
          <div className="bowling-left-content">
            <div className="bowling-spacer-large" />
            {tags.map((tag) => (
              <div key={tag.text} className="bowling-tag-wrapper">
                <span className={`bowling-tag ${tag.className}`}>
                  {tag.text}
                </span>
              </div>
            ))}
            <div className="bowling-spacer-large" />
          </div>
        </div>

        <div className="bowling-right">
          <div className="bowling-right-content">
            <div className="bowling-spacer-right" />
            <p className="bowling-subtitle">¿Estás preparado para</p>
            <h2 className="bowling-title">EL BOWLING?</h2>
            <h2 className="bowling-description">
              Nuestros espacios están listos para darte una experiencia llena de
              <span style={{ color: '#80ad80' }}> risas</span> &amp;{' '}
              <span style={{ color: '#e68007' }}>diversión.</span>
            </h2>
            <div className="bowling-cta">
              <a
                className="elementor-button elementor-animation-grow"
                href="/contacto"
              >
                CONTÁCTANOS
              </a>
            </div>
            <div className="bowling-spacer-bottom-right" />
          </div>
        </div>
      </div>
    </section>
  )
}
