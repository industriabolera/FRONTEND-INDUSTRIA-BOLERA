import { useCallback, useEffect, useRef, useState } from 'react'
import './ServiciosCarousel.css'

const slides = [
  '/images/IMG_6445-768x512.jpg',
  '/images/IMG_6441-768x512.jpg',
  '/images/IMG_6429-768x512.jpg',
  '/images/IMG_6425-768x512.jpg',
  '/images/IMG_6419-768x512.jpg',
  '/images/IMG_6397-768x512.jpg',
  '/images/IMG_6383-768x512.jpg',
  '/images/IMG_6376-768x512.jpg',
  '/images/IMG_6361-768x512.jpg',
  '/images/IMG_6347-768x512.jpg',
  '/images/IMG_6345-768x512.jpg',
  '/images/IMG_6336-768x512.jpg',
  '/images/IMG_6325-768x512.jpg',
  '/images/IMG_6324-768x512.jpg',
  '/images/IMG_6323-768x512.jpg',
  '/images/IMG_6321-768x512.jpg',
  '/images/IMG_6319-768x512.jpg',
  '/images/IMG_6313-768x512.jpg',
  '/images/W59A0885-768x512.jpg',
]

const AUTOPLAY_MS = 5000

export default function ServiciosCarousel() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const total = slides.length
  const intervalRef = useRef(null)

  const next = useCallback(() => {
    setIndex((prev) => (prev + 1) % total)
  }, [total])

  const prev = useCallback(() => {
    setIndex((prev) => (prev - 1 + total) % total)
  }, [total])

  useEffect(() => {
    if (paused) return undefined
    intervalRef.current = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % total)
    }, AUTOPLAY_MS)
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
      }
    }
  }, [paused, total])

  return (
    <section
      className="servicios-carousel"
      aria-roledescription="carousel"
      aria-label="Galería La Industria Bolera"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="servicios-carousel-track">
        {slides.map((src, i) => (
          <figure
            key={src}
            className={`servicios-carousel-slide ${i === index ? 'is-active' : ''}`}
            aria-hidden={i !== index}
          >
            <img
              src={src}
              alt={`Pista de bolos ${i + 1}`}
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          </figure>
        ))}

        <button
          type="button"
          className="servicios-carousel-arrow servicios-carousel-arrow-prev"
          aria-label="Anterior"
          onClick={prev}
        >
          <span aria-hidden="true">‹</span>
        </button>
        <button
          type="button"
          className="servicios-carousel-arrow servicios-carousel-arrow-next"
          aria-label="Siguiente"
          onClick={next}
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>

      <div className="servicios-carousel-dots" role="tablist">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Ir a la imagen ${i + 1}`}
            className={`servicios-carousel-dot ${i === index ? 'is-active' : ''}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </section>
  )
}
