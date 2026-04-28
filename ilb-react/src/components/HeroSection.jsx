import './HeroSection.css'

export default function HeroSection() {
  return (
    <section className="hero-section">
      <div className="hero-background" aria-hidden="true">
        <div
          className="hero-bg-image"
          style={{ backgroundImage: "url('/images/Untitled-design.png')" }}
        />
      </div>

      <div className="hero-container">
        <div className="hero-content">
          <div className="hero-widget-wrap">
            {/* Dots image widget */}
            <div className="hero-widget hero-widget-dots">
              <div className="hero-widget-container">
                <img className="hero-dots-img" src="/images/ColoresHead_Bolera.png" alt="" />
              </div>
            </div>

            {/* DISEÑAMOS widget */}
            <div className="hero-widget hero-widget-fabricamos">
              <div className="hero-widget-container">
                <p className="hero-fabricamos">DISEÑAMOS </p>
              </div>
            </div>

            {/* DIVERSIÓN widget */}
            <div className="hero-widget hero-widget-diversion">
              <div className="hero-widget-container">
                <p className="hero-diversion">DIVERSIÓN</p>
              </div>
            </div>

            {/* Animated headline widget */}
            <div className="hero-widget hero-widget-headline">
              <div className="hero-widget-container">
                <p className="hero-headline">
                  <span className="hero-plain-text">pines y </span>
                  <span className="hero-dynamic-text">
                    <span className="hero-highlight">bolas</span>
                    <svg className="hero-underline-svg" viewBox="0 0 100 10" preserveAspectRatio="none">
                      <path d="M2 6 C 20 1, 40 10, 60 6 S 85 2, 98 6" />
                    </svg>
                  </span>
                </p>
              </div>
            </div>

            {/* CTA widget */}
            <div className="hero-widget hero-widget-cta">
              <div className="hero-widget-container">
                <a className="hero-btn" href="/reservas">
                  ¡RESERVA YA!
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
