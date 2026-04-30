import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  HISTORIA_CIERRE,
  HISTORIA_MURO_QUOTE,
  HISTORIA_PARAGRAPHS,
  HISTORIA_TAGLINE,
  INSTANTANEAS_SLIDES,
  TENEMOS_PARAGRAPHS,
  TENEMOS_TITLES,
} from './content/sobreHistoria'
import './PageShell.css'
import './StaticSitePages.css'

export default function SobreNosotrosPage() {
  const n = INSTANTANEAS_SLIDES.length
  const [slide, setSlide] = useState(0)

  const go = useCallback(
    (dir) => {
      setSlide((s) => (s + dir + n) % n)
    },
    [n],
  )

  useEffect(() => {
    const t = setInterval(() => go(1), 5500)
    return () => clearInterval(t)
  }, [go])

  const current = INSTANTANEAS_SLIDES[slide]
  const bg = useMemo(() => ({ backgroundImage: `url(${current.src})` }), [current.src])

  return (
    <section className="page-shell">
      <div className="page-shell-bg" />
      <div className="page-shell-container">
        <header className="page-shell-header">
          <h1 className="page-shell-title">Sobre Nosotros</h1>
          <p className="page-shell-subtitle">
            Nos inspiramos en las fábricas de Nueva York de principio de siglo. Somos la fábrica de la diversión.
          </p>
        </header>

        <div className="page-shell-body">
          <p className="about-tagline">{HISTORIA_TAGLINE}</p>

          <div className="about-hero-img">
            <img src="/images/Bowls2.png" alt="Pista de bolos en La Industria Bolera" width={1000} height={750} />
          </div>

          <div className="about-split">
            <div className="about-story">
              {HISTORIA_PARAGRAPHS.map((text) => (
                <p key={text}>{text}</p>
              ))}
              <blockquote className="quote-muro">{HISTORIA_MURO_QUOTE}</blockquote>
              <p>{HISTORIA_CIERRE}</p>
            </div>
            <aside className="about-aside-panel" aria-labelledby="aside-est">
              <h2 id="aside-est" className="est">
                EST. 2019
              </h2>
              <div className="divider" />
              <img className="decor" src="/images/Puntos_LaIndustria.png" alt="" width={198} height={22} />
              <p className="historic">Nuestra</p>
              <p className="historic">historia</p>
              <div className="divider" style={{ marginTop: 22 }} />
            </aside>
          </div>

          <div className="about-offer-split">
            <div className="about-carousel-shell">
              <div className="about-carousel-frame">
                <div className="about-carousel-visual" style={bg} role="img" aria-label={current.label} />
                <span className="about-carousel-caption">{current.label}</span>
                <div className="about-carousel-nav">
                  <button type="button" className="about-carousel-btn" onClick={() => go(-1)} aria-label="Anterior">
                    ‹
                  </button>
                  <button type="button" className="about-carousel-btn" onClick={() => go(1)} aria-label="Siguiente">
                    ›
                  </button>
                </div>
              </div>
              <div className="about-carousel-dots" role="tablist" aria-label="Instantáneas">
                {INSTANTANEAS_SLIDES.map((s, i) => (
                  <button
                    key={s.src}
                    type="button"
                    className={`about-carousel-dot${i === slide ? ' active' : ''}`}
                    aria-label={`Ver imagen ${i + 1}`}
                    aria-current={i === slide}
                    onClick={() => setSlide(i)}
                  />
                ))}
              </div>
            </div>
            <div className="about-offer-text">
              <h3>{TENEMOS_TITLES[0]}</h3>
              <h3 style={{ marginTop: 4 }}>{TENEMOS_TITLES[1]}</h3>
              {TENEMOS_PARAGRAPHS.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
