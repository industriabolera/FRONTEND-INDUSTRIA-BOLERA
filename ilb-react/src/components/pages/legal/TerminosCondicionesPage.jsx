import LegalPageLayout from './LegalPageLayout'

const ACTIVE_PATH = '/terminos-y-condiciones'

export default function TerminosCondicionesPage() {
  return (
    <LegalPageLayout
      activePath={ACTIVE_PATH}
      title="Términos y Condiciones de Uso"
      intro="Estos términos regulan el uso del sitio web, el sistema de reservas y la prestación de los servicios de La Industria Bolera, en concordancia con el Estatuto del Consumidor (Ley 1480 de 2011)."
    >
      <section className="legal-section">
        <h2>1. Aceptación de los términos</h2>
        <p>
          El acceso, navegación y uso del sitio web de La Industria Bolera implican la aceptación plena e
          incondicional de los presentes Términos y Condiciones. Si el usuario no está de acuerdo con
          ellos, deberá abstenerse de utilizar el sitio y sus servicios en línea.
        </p>
        <p>
          Las reservas y compras realizadas a través del sitio constituyen una aceptación expresa de estas
          condiciones al momento de confirmar la transacción.
        </p>
      </section>

      <section className="legal-section">
        <h2>2. Capacidad legal y admisión al establecimiento</h2>
        <p>
          Para realizar reservas o compras en línea, el usuario debe ser mayor de edad y contar con
          capacidad legal para contratar. Los menores de edad podrán acceder al establecimiento
          acompañados por un adulto responsable que responda por ellos.
        </p>
        <p>
          La Industria Bolera se reserva el derecho de admisión conforme a sus políticas internas de
          convivencia y seguridad. Podrá negar el ingreso o retirar del establecimiento a personas que
          incurran en conductas contrarias a la ley, al orden o a las normas de convivencia.
        </p>
      </section>

      <section className="legal-section">
        <h2>3. Reservas, tarifas y medios de pago</h2>
        <p>
          Las reservas de pistas, eventos y demás servicios se realizan a través del sitio web y quedan
          sujetas a disponibilidad. Los valores, tarifas y promociones publicados pueden variar y se
          confirman al momento de la transacción.
        </p>
        <ul>
          <li>
            <strong>Medios de pago:</strong> los pagos se procesan de forma segura a través de la pasarela
            <strong> PlaceToPay</strong>. Al continuar, el usuario es redirigido a dicha plataforma.
          </li>
          <li>
            <strong>Puntualidad:</strong> se solicita llegar con antelación suficiente a la hora reservada.
            El tiempo no utilizado por retraso del cliente no genera devolución ni extensión del turno.
          </li>
          <li>
            <strong>Confirmación:</strong> una vez confirmado el pago, la reserva se valida y se remite la
            confirmación al contacto registrado, usualmente por WhatsApp o correo electrónico.
          </li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>4. Cancelaciones, reprogramaciones y derecho de retracto</h2>
        <p>
          Conforme al Estatuto del Consumidor (Ley 1480 de 2011), el usuario podrá ejercer el derecho de
          retracto cuando aplique dentro de los términos legales, siempre que las condiciones del servicio
          lo permitan.
        </p>
        <ul>
          <li>
            <strong>Cancelaciones:</strong> las solicitudes de cancelación deben presentarse con antelación
            por los canales de contacto oficiales. La aplicación de devoluciones dependerá de la
            antelación y de las condiciones particulares de la reserva.
          </li>
          <li>
            <strong>Reprogramaciones:</strong> se permitirán sujetas a disponibilidad y a las condiciones
            informadas al momento de la reserva.
          </li>
          <li>
            <strong>Servicios prestados:</strong> las reservas ya disfrutadas o cuyo turno haya iniciado no
            son objeto de devolución.
          </li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>5. Normas de uso de pistas, calzado especial y seguridad dentro de la bolera</h2>
        <ul>
          <li>Es obligatorio el uso de <strong>calzado especial para bolos</strong> dentro de las pistas.</li>
          <li>Está prohibido ingresar con alimentos, bebidas o sustancias que puedan afectar el área de juego.</li>
          <li>Se debe respetar el turno de cada pista y las indicaciones del personal.</li>
          <li>Los menores de edad deben estar acompañados y supervisados por un adulto responsable.</li>
          <li>No se permite correr, deslizarse fuera del área designada ni realizar maniobras que pongan en riesgo a otros.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>6. Cuidado de pertenencias personales y exoneración de responsabilidad por descuido</h2>
        <p>
          El usuario es responsable del cuidado de sus pertenencias personales. La Industria Bolera no
          responde por la pérdida, sustracción o daño de objetos personales dejados sin custodia o por
          descuido del usuario, salvo en los casos en que la ley disponga lo contrario.
        </p>
      </section>

      <section className="legal-section">
        <h2>7. Propiedad intelectual y enlaces a terceros</h2>
        <p>
          Todos los contenidos del sitio (textos, imágenes, logotipos, marcas y diseño) son propiedad de
          La Industria Bolera o se utilizan con autorización, y están protegidos por la normatividad de
          propiedad intelectual. Queda prohibida su reproducción o uso no autorizado.
        </p>
        <p>
          El sitio puede contener enlaces a plataformas de terceros, como la pasarela de pagos. La
          Industria Bolera no es responsable de las políticas, contenidos ni prácticas de dichos terceros.
        </p>
      </section>

      <section className="legal-section">
        <h2>8. Modificaciones a los términos y legislación aplicable</h2>
        <p>
          La Industria Bolera podrá modificar estos Términos y Condiciones en cualquier momento. Las
          modificaciones regirán desde su publicación en el sitio web.
        </p>
        <p>
          Estos términos se rigen por la legislación colombiana. Cualquier controversia se someterá a la
          jurisdicción de las autoridades competentes de la República de Colombia.
        </p>
      </section>
    </LegalPageLayout>
  )
}
