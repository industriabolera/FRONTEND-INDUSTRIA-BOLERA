import { useEffect, useState } from 'react'
import { MENU_PDF_URL } from '../../../constants/menuPdf'
import './ServiciosMenuSection.css'

const slideshow = [
  '/images/W59A1538.jpg',
  '/images/W59A1544.jpg',
  '/images/W59A2327.jpg',
  '/images/W59A5808.jpg',
  '/images/W59A5855.jpg',
  '/images/W59A8935.jpg',
  '/images/W59A8946.jpg',
  '/images/W59A9186.jpg',
  '/images/W59A9225.jpg',
  '/images/W59A9297.jpg',
]

const SLIDE_MS = 4500

export default function ServiciosMenuSection() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrent((prev) => (prev + 1) % slideshow.length)
    }, SLIDE_MS)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <>
      <section className="servicios-menu-banner">
        <div className="servicios-menu-banner-inner">
          <h2 className="servicios-menu-banner-title">
            <span className="servicios-menu-banner-pre">Además de bolos tenemos</span>
            <strong>la mejor comida.</strong>
          </h2>
        </div>
      </section>

      <section className="servicios-menu">
        <div className="servicios-menu-grid">
          <div className="servicios-menu-text">
            <h1 className="servicios-menu-title-yellow">NUESTRO</h1>
            <h2 className="servicios-menu-title-cursive">menú</h2>
            <span className="servicios-menu-divider" />
            <p className="servicios-menu-description">
              Para que la diversión y el compartir no paren tenemos una gran
              opción de comidas y bebidas en nuestro menú.
            </p>
            <a
              className="servicios-menu-button"
              href={MENU_PDF_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              VER MENÚ
            </a>
          </div>

          <div
            className="servicios-menu-slideshow"
            aria-roledescription="slideshow"
            aria-label="Galería del menú"
          >
            {slideshow.map((src, i) => (
              <div
                key={src}
                className={`servicios-menu-slide ${i === current ? 'is-active' : ''}`}
                style={{ backgroundImage: `url(${src})` }}
                aria-hidden={i !== current}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
