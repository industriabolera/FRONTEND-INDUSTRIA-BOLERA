import { Link } from 'react-router-dom'
import './PageShell.css'
import './CumpleanosPage.css'

const PLANES_ADULTOS = [
  {
    nombre: 'Alitas',
    precio: '$977.400',
    items: ['2 horas de juego', '2 pistas de bolos', '12 zapatos + medias', '48 alitas + papas + gaseosa', 'Kit de cumpleaños: torta para 12 y decoración'],
  },
  {
    nombre: 'Perros',
    precio: '$1.105.200',
    items: ['2 horas de juego', '2 pistas de bolos', '12 zapatos + medias', '12 perros + papas + 12 gaseosas', 'Kit de cumpleaños: torta para 12 y decoración'],
  },
  {
    nombre: 'Hamburguesas',
    precio: '$1.251.600',
    items: ['2 horas de juego', '2 pistas de bolos', '12 zapatos + medias', '12 hamburguesas + papas + 12 gaseosas', 'Kit de cumpleaños: torta para 12 y decoración'],
  },
]

export default function CumpleanosPage() {
  return (
    <section className="page-shell cumpleanos-page">
      <div className="page-shell-bg" />
      <div className="cumple-hero" role="img" aria-label="Celebración de cumpleaños en las pistas de La Industria Bolera">
        <div className="cumple-hero-copy">
          <span>Una celebración diferente</span>
          <h1>Juega, comparte y celebra a lo grande.</h1>
          <p>Planes de cumpleaños con bolos, comida, torta y decoración para disfrutar sin preocuparte por nada.</p>
        </div>
      </div>

      <div className="page-shell-container">
        <header className="page-shell-header cumpleanos-intro">
          <h2 className="page-shell-title">Cumpleaños en La Industria Bolera</h2>
          <p className="page-shell-subtitle">
            Celebra tu día en un espacio pensado para la diversión: pistas de bolos, comida deliciosa y un kit
            de cumpleaños con torta y decoración listo para ti y tus invitados.
          </p>
        </header>

        <div className="page-shell-body">
          <section id="planes" className="cumple-kids" aria-labelledby="cumple-kids-title">
            <div className="cumple-kids-badge">Menores de 12 años</div>
            <h2 id="cumple-kids-title" className="cumple-section-title">Cumpleaños para los más pequeños</h2>
            <ul className="cumple-list">
              <li>2 pistas de bolos</li>
              <li>12 zapatos y medias</li>
              <li>12 combos (menú infantil + jugo Hit)</li>
              <li>Kit de cumpleaños con torta para 12 personas y decoración</li>
            </ul>
            <div className="cumple-prices">
              <div className="cumple-price">
                <span className="cumple-price-tag">1 hora</span>
                <span className="cumple-price-amount">$783.600</span>
              </div>
              <div className="cumple-price">
                <span className="cumple-price-tag">2 horas</span>
                <span className="cumple-price-amount">$1.047.600</span>
              </div>
            </div>
          </section>

          <section className="cumple-adults" aria-labelledby="cumple-adults-title">
            <h2 id="cumple-adults-title" className="cumple-section-title">Cumpleaños para adultos</h2>
            <p className="cumple-adults-intro">
              Tres planes completos de 2 horas, cada uno con 2 pistas de bolos, 12 zapatos + medias y un kit de
              cumpleaños con torta para 12 y decoración. Solo elige tu plato principal.
            </p>
            <div className="cumple-cards">
              {PLANES_ADULTOS.map((plan) => (
                <article key={plan.nombre} className="cumple-card">
                  <h3 className="cumple-card-name">{plan.nombre}</h3>
                  <p className="cumple-card-price">{plan.precio}</p>
                  <ul className="cumple-list cumple-card-list">
                    {plan.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section className="cumple-benefits" aria-labelledby="cumple-benefits-title">
            <h2 id="cumple-benefits-title" className="cumple-section-title">¿Por qué celebrarlo aquí?</h2>
            <p>
              Preparamos todo para que solo llegues a disfrutar: pistas listas, comida para tu grupo, y un espacio
              seguro y divertido para grandes y pequeños. Tú te encargas de la fiesta; nosotros, de la diversión.
            </p>
          </section>

          <div className="cumple-cta">
            <Link className="cumple-cta-button" to="/reservas#reservar">
              RESERVA TU CUMPLEAÑOS
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
