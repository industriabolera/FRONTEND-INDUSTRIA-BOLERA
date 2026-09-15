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
        <h2>1. Identificación del operador</h2>
        <p>
          El presente sitio web y los servicios ofrecidos en el establecimiento son operados por{' '}
          <strong>ENTRETENIMIENTO Y DIVERSIÓN S.A.S.</strong>, identificada con{' '}
          <strong>NIT 901.273.723-6</strong>, que actúa comercialmente bajo la marca y el establecimiento
          de comercio <strong>La Industria Bolera</strong>, con domicilio en Medellín, Antioquia,
          Colombia, y dirección de atención en Carrera 70 # 1 – 141, Local 453, Arkadia Centro
          Comercial, Medellín.
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
        <h2>2. Aceptación de los términos</h2>
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
        <h2>3. Capacidad legal y admisión al establecimiento</h2>
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
        <h2>4. Horarios oficiales de atención</h2>
        <ul>
          <li><strong>Lunes a miércoles:</strong> 12:00 m a 10:00 p.m.</li>
          <li><strong>Jueves a sábado:</strong> 12:00 m a 11:00 p.m.</li>
          <li><strong>Domingos:</strong> 12:00 m a 9:00 p.m.</li>
          <li><strong>Domingos antes de festivo:</strong> 12:00 m a 11:00 p.m.</li>
          <li><strong>Días festivos:</strong> 12:00 m a 9:00 p.m.</li>
        </ul>
        <p>
          Los horarios pueden variar por eventos privados, mantenimiento o circunstancias de fuerza
          mayor. Las variaciones se informarán por los canales oficiales de contacto.
        </p>
      </section>

      <section className="legal-section">
        <h2>5. Reservas, puntualidad y medios de pago</h2>
        <p>
          Las reservas de pistas, eventos y demás servicios se realizan a través del sitio web y quedan
          sujetas a disponibilidad. Los valores, tarifas y promociones publicados pueden variar y se
          confirman al momento de la transacción.
        </p>
        <ul>
          <li>
            <strong>Anticipación mínima de la reserva:</strong> las reservas web deben realizarse con un
            mínimo de <strong>4 horas de anticipación</strong> respecto de la hora solicitada.
          </li>
          <li>
            <strong>Presentación puntual:</strong> el cliente debe presentarse con{' '}
            <strong>20 minutos de anticipación</strong> a la hora reservada, tiempo necesario para la
            asignación de la pista y la entrega del calzado y las medias.
          </li>
          <li>
            <strong>Medios de pago:</strong> los pagos se procesan de forma segura a través de la pasarela
            <strong> PlaceToPay</strong>. Al continuar, el usuario es redirigido a dicha plataforma.
          </li>
          <li>
            <strong>Confirmación:</strong> una vez confirmado el pago, la reserva se valida y se remite la
            confirmación al contacto registrado, usualmente por WhatsApp o correo electrónico.
          </li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>6. Tolerancia y política de no-show</h2>
        <p>
          La reserva se mantiene hasta <strong>15 minutos</strong> posteriores a la hora programada.
          Transcurrido ese plazo, la pista queda sujeta a disponibilidad del establecimiento y{' '}
          <strong>no habrá devolución de dinero, entendiéndose como pérdida del valor pagado por la
          reserva</strong>.
        </p>
        <p>
          El tiempo transcurrido por el retraso del cliente consume su propio tiempo de pista y no genera
          extensión del turno ni compensación.
        </p>
      </section>

      <section className="legal-section">
        <h2>7. Reprogramaciones y fallas técnicas</h2>
        <p>
          El cliente podrá solicitar la reprogramación de su reserva con un mínimo de{' '}
          <strong>4 horas de anticipación</strong>, sujeta a disponibilidad del establecimiento.
        </p>
        <p>
          Si se presentan fallas técnicas atribuibles a la bolera o interrupciones del servicio que
          superen los <strong>15 minutos</strong>, La Industria Bolera coordinará con el cliente una
          <strong> reprogramación, un bono o la devolución del dinero</strong>, según la preferencia del
          cliente y la disponibilidad.
        </p>
      </section>

      <section className="legal-section">
        <h2>8. Cancelaciones y derecho de retracto</h2>
        <p>
          Conforme al <strong>derecho de retracto</strong> previsto en el{' '}
          <strong>artículo 47 de la Ley 1480 de 2011</strong>, el usuario podrá retractarse de las compras
          realizadas en línea dentro de los <strong>cinco (5) días hábiles</strong> siguientes a la
          compra, siempre que el servicio no haya iniciado ni esté previsto para una fecha dentro de ese
          plazo.
        </p>
        <ul>
          <li>
            <strong>Solicitud:</strong> el retracto debe solicitarse por correo electrónico a los canales
            oficiales, adjuntando el soporte de pago y los datos de la transacción.
          </li>
          <li>
            <strong>Reintegro:</strong> una vez aprobada la solicitud, el reintegro del dinero se
            realizará en aproximadamente <strong>8 días hábiles</strong>, dentro del tope legal máximo de{' '}
            <strong>30 días calendario</strong>.
          </li>
          <li>
            <strong>Servicios prestados:</strong> las reservas ya disfrutadas o cuyo turno haya iniciado
            no son objeto de devolución.
          </li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>9. Normas de uso y seguridad en pista</h2>
        <ul>
          <li>
            <strong>Calzado y medias:</strong> es <strong>estrictamente obligatorio</strong> el uso de
            calzado especial para bolos y de medias desechables dentro de las pistas. Está prohibido
            jugar en medias solas o con calzado de calle.
          </li>
          <li>
            <strong>Línea de falta:</strong> está prohibido pisar o traspasar la línea de falta (fault
            line) hacia la pista aceitada.
          </li>
          <li>
            <strong>Capacidad:</strong> la capacidad máxima es de <strong>6 jugadores por pista</strong> y
            no se permite el intercambio de jugadores durante el turno.
          </li>
          <li>
            <strong>Edad y estatura:</strong> la edad mínima para jugar es de <strong>5 años</strong> o
            una estatura mínima de <strong>110 cm</strong>.
          </li>
          <li>
            <strong>Uso de bolas y máquina:</strong> se debe usar una bola a la vez, de peso propicio para
            el jugador, deslizándola a ras de pista. Se debe esperar a que la barredora termine su ciclo y
            está prohibido introducir la mano en el retorno de bolas.
          </li>
          <li>
            <strong>Prohibiciones:</strong> no se permite ingresar comida o bebidas externas ni mascotas,
            ni jugar bajo los efectos del alcohol en exceso o de sustancias alucinógenas.
          </li>
          <li>
            <strong>Conducta:</strong> se debe respetar el turno de cada pista y las indicaciones del
            personal, y no correr, deslizarse fuera del área designada ni realizar maniobras que pongan
            en riesgo a otros.
          </li>
          <li>
            <strong>Videovigilancia:</strong> el establecimiento cuenta con circuito cerrado de televisión
            (CCTV) con fines exclusivos de control interno, prevención y seguridad.
          </li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>10. Cobro por daños</h2>
        <p>
          El cliente, o el adulto responsable cuando se trate de menores de edad, asume la
          responsabilidad y el <strong>cobro patrimonial total por los daños</strong> ocasionados a
          pistas, bolas, consolas, pantallas o infraestructura del establecimiento por negligencia o uso
          indebido.
        </p>
      </section>

      <section className="legal-section">
        <h2>11. Cuidado de pertenencias personales y exoneración de responsabilidad por descuido</h2>
        <p>
          El usuario es responsable del cuidado de sus pertenencias personales. La Industria Bolera no
          responde por la pérdida, sustracción o daño de objetos personales dejados sin custodia o por
          descuido del usuario, salvo en los casos en que la ley disponga lo contrario.
        </p>
      </section>

      <section className="legal-section">
        <h2>12. Propiedad intelectual y enlaces a terceros</h2>
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
        <h2>13. Modificaciones a los términos y legislación aplicable</h2>
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
