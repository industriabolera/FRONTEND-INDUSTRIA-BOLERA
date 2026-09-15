import { Link } from 'react-router-dom'
import LegalPageLayout from './LegalPageLayout'
import { openConsentBanner } from '../../../utils/consentManager'

const ACTIVE_PATH = '/politica-de-cookies'

const STORAGE_ROWS = [
  {
    name: 'ilb_cookie_consent_v1',
    type: 'Técnica (almacenamiento local)',
    purpose: 'Guarda tu decisión de consentimiento, la versión de la política y el identificador único de consentimiento.',
    duration: 'Persistente hasta que borres los datos del navegador.',
  },
  {
    name: 'ilb_requestId',
    type: 'Técnica (almacenamiento local)',
    purpose: 'Identifica de forma anónima una solicitud de reserva para evitar duplicados y mantener el estado del proceso.',
    duration: 'Temporal / hasta finalizar la sesión de reserva.',
  },
  {
    name: 'Cookies analíticas',
    type: 'Analítica (solo con consentimiento)',
    purpose: 'Miden de forma agregada el tráfico y el uso del sitio para mejorar nuestros servicios. No se activan antes de tu autorización.',
    duration: 'Según el proveedor de analítica (máximo 24 meses).',
  },
]

export default function PoliticaCookiesPage() {
  const handleReconfigure = () => {
    openConsentBanner()
  }

  return (
    <LegalPageLayout
      activePath={ACTIVE_PATH}
      title="Política de Cookies"
      intro="Aquí explicamos qué son las cookies y tecnologías de almacenamiento, cuáles usamos en La Industria Bolera y cómo puedes gestionar tus preferencias."
    >
      <section className="legal-section">
        <h2>1. ¿Qué son las cookies?</h2>
        <p>
          Las cookies y tecnologías similares (como el almacenamiento local del navegador) son pequeños
          archivos o registros que los sitios web guardan en tu dispositivo. Permiten recordar tus
          preferencias, mantener el funcionamiento del sitio y, cuando lo autorizas, obtener información
          estadística sobre cómo se usa la página.
        </p>
      </section>

      <section className="legal-section">
        <h2>2. Responsable</h2>
        <p>
          El responsable del tratamiento de los datos asociados a las cookies y tecnologías de
          almacenamiento es <strong>ENTRETENIMIENTO Y DIVERSIÓN S.A.S.</strong>, identificada con{' '}
          <strong>NIT 901.273.723-6</strong>, que opera el establecimiento comercial{' '}
          <strong>La Industria Bolera</strong>, con domicilio en Medellín, Antioquia, Colombia.
        </p>
        <ul>
          <li>
            <strong>Correos electrónicos:</strong>{' '}
            <a href="mailto:entretenimientoydiversionsas@gmail.com">entretenimientoydiversionsas@gmail.com</a> y{' '}
            <a href="mailto:laindustriabolera@gmail.com">laindustriabolera@gmail.com</a>
          </li>
          <li><strong>Teléfono fijo:</strong> (604) 604 3059</li>
          <li><strong>WhatsApp de atención:</strong> (57) 311 354 0008</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>3. Tipos de cookies que usamos</h2>
        <ul>
          <li>
            <strong>Técnicas o necesarias:</strong> imprescindibles para el funcionamiento del sitio.
            Mantienen la sesión, el estado del carrito o del proceso de reserva y almacenan tu decisión de
            consentimiento. No requieren autorización previa.
          </li>
          <li>
            <strong>Analíticas:</strong> opcionales y solo se activan con tu consentimiento. Nos permiten
            medir el tráfico y comprender cómo interactúas con nuestra web para mejorar la experiencia y
            nuestros servicios.
          </li>
        </ul>
        <p>
          No utilizamos cookies de publicidad personalizada ni compartimos datos de navegación con
          anunciantes sin tu consentimiento.
        </p>
      </section>

      <section className="legal-section">
        <h2>4. Consent Mode v2 de Google (modo Básico)</h2>
        <p>
          Este sitio implementa <strong>Google Consent Mode v2</strong> en su <strong>modo
          Básico</strong>. Esto significa que las señales de consentimiento se envían a Google con el
          estado predeterminado en <strong>denegado</strong>: las cookies analíticas quedan{' '}
          <strong>bloqueadas de fábrica</strong> y no se activan hasta que otorgas tu aceptación expresa
          a través del panel de consentimiento.
        </p>
        <p>
          Cuando aceptas las cookies analíticas, la señal se actualiza a <strong>concedido</strong> y se
          habilitan las tecnologías de medición. Si rechazas las cookies opcionales o no interactúas con
          el panel, la analítica permanece bloqueada y solo se utilizan las cookies técnicas necesarias
          para el funcionamiento del sitio. Puedes cambiar tu decisión en cualquier momento desde el
          botón de reconfiguración.
        </p>
      </section>

      <section className="legal-section">
        <h2>5. Detalle de cookies y almacenamiento</h2>
        <p>La siguiente tabla describe las cookies y registros de almacenamiento que utiliza el sitio:</p>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Finalidad</th>
                <th>Duración</th>
              </tr>
            </thead>
            <tbody>
              {STORAGE_ROWS.map((row) => (
                <tr key={row.name}>
                  <td><strong>{row.name}</strong></td>
                  <td>{row.type}</td>
                  <td>{row.purpose}</td>
                  <td>{row.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="legal-section">
        <h2>6. Reconfigurar mis preferencias</h2>
        <p>
          Puedes cambiar tu decisión en cualquier momento. Al pulsar el botón se abrirá nuevamente el panel
          de consentimiento para que aceptes todas las cookies o continúes solo con las necesarias.
        </p>
        <div className="legal-cookie-action">
          <button type="button" className="legal-cookie-button" onClick={handleReconfigure}>
            Reconfigurar mis preferencias de cookies
          </button>
        </div>
      </section>

      <section className="legal-section">
        <h2>7. Cómo gestionar o deshabilitar cookies desde el navegador</h2>
        <p>
          Además del panel de preferencias, puedes administrar o eliminar las cookies desde la
          configuración de tu navegador:
        </p>
        <ul>
          <li>
            <strong>Google Chrome:</strong> Configuración → Privacidad y seguridad → Cookies y otros datos
            de sitios.
          </li>
          <li>
            <strong>Mozilla Firefox:</strong> Ajustes → Privacidad y seguridad → Cookies y datos del sitio.
          </li>
          <li>
            <strong>Safari:</strong> Preferencias → Privacidad → Gestionar datos de sitios web.
          </li>
          <li>
            <strong>Microsoft Edge:</strong> Configuración → Cookies y permisos del sitio → Administrar y
            eliminar cookies.
          </li>
        </ul>
        <div className="legal-page__note">
          <p>
            Si deshabilitas las cookies técnicas, algunas funciones del sitio (como el proceso de reserva)
            podrían no funcionar correctamente. Bloquear las cookies analíticas no afecta el uso básico del
            sitio.
          </p>
        </div>
      </section>

      <section className="legal-section">
        <h2>8. Canales de atención</h2>
        <p>
          Para consultas sobre esta política o sobre el tratamiento de tus datos personales, puedes
          contactarnos a través de los siguientes canales:
        </p>
        <ul>
          <li>
            <strong>Correos electrónicos:</strong>{' '}
            <a href="mailto:entretenimientoydiversionsas@gmail.com">entretenimientoydiversionsas@gmail.com</a> y{' '}
            <a href="mailto:laindustriabolera@gmail.com">laindustriabolera@gmail.com</a>
          </li>
          <li><strong>Teléfono fijo:</strong> (604) 604 3059</li>
          <li><strong>WhatsApp de atención:</strong> (57) 311 354 0008</li>
          <li>
            <strong>Presencial:</strong> Carrera 70 # 1 – 141, Local 453, Arkadia Centro Comercial,
            Medellín
          </li>
          <li>
            <strong>Política de Privacidad:</strong>{' '}
            <Link to="/politica-de-privacidad">consulta el detalle del tratamiento de tus datos</Link>
          </li>
        </ul>
      </section>
    </LegalPageLayout>
  )
}
