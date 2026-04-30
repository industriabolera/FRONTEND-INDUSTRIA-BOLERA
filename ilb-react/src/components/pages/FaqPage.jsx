import { useId, useState } from 'react'
import { FAQ_SECTIONS } from './content/faqData'
import './PageShell.css'
import './StaticSitePages.css'

function sectionDomId(sectionId) {
  if (sectionId === 'bolos') return 'Bolos'
  if (sectionId === 'eventos') return 'Eventos'
  return 'Otros'
}

export default function FaqPage() {
  const uid = useId()
  const [openKey, setOpenKey] = useState(null)

  return (
    <section className="page-shell">
      <div className="page-shell-bg" />
      <div className="page-shell-container">
        <header className="page-shell-header">
          <div className="static-faq-hero-strip">
            <img src="/images/ColoresHead_Bolera.png" width={415} height={178} alt="" decoding="async" />
            <h1 className="page-shell-title">PREGUNTAS & RESPUESTAS</h1>
            <p className="static-faq-sub">
              Nuestros espacios están listos para darte una experiencia llena de{' '}
              <span className="color-laugh">risas</span> &amp; <span className="color-fun">diversión.</span>
            </p>
          </div>
        </header>

        <nav className="static-faq-jumps" aria-label="Saltar a sección">
          <a href="#Bolos">BOLOS</a>
          <a href="#Eventos">EVENTOS &amp; CELEBRACIONES</a>
          <a href="#Otros">OTROS SERVICIOS</a>
        </nav>

        <div className="page-shell-body">
          {FAQ_SECTIONS.map((section) => (
            <section key={section.id} id={sectionDomId(section.id)} className="static-faq-section">
              <h2>{section.title}</h2>
              <div>
                {section.items.map((item, index) => {
                  const panelId = `${uid}-${section.id}-${index}`
                  const key = `${section.id}-${index}`
                  const open = openKey === key
                  return (
                    <div key={key} className={`faq-acc-item${open ? ' open' : ''}`}>
                      <button
                        type="button"
                        className="faq-acc-button"
                        aria-expanded={open}
                        aria-controls={panelId}
                        id={`${panelId}-btn`}
                        onClick={() => setOpenKey(open ? null : key)}
                      >
                        <span className="faq-acc-chev" aria-hidden>▶</span>
                        <span>{item.question}</span>
                      </button>
                      <div id={panelId} role="region" aria-labelledby={`${panelId}-btn`} hidden={!open}>
                        <div
                          className="faq-acc-panel-inner"
                          dangerouslySetInnerHTML={{ __html: item.answerHtml }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  )
}
