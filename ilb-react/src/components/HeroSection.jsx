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

            {/* Main heading — single H1: "DISEÑAMOS DIVERSIÓN" */}
            <h1 className="hero-main-title">
              <span className="hero-widget hero-widget-fabricamos">
                <span className="hero-widget-container">
                  <span className="hero-fabricamos">DISEÑAMOS </span>
                </span>
              </span>
              <span className="hero-widget hero-widget-diversion">
                <span className="hero-widget-container">
                  <span className="hero-diversion">DIVERSIÓN</span>
                </span>
              </span>
            </h1>

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
