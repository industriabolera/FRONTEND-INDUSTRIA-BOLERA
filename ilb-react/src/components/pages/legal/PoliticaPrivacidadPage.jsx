import LegalPageLayout from './LegalPageLayout'

const ACTIVE_PATH = '/politica-de-privacidad'

export default function PoliticaPrivacidadPage() {
  return (
    <LegalPageLayout
      activePath={ACTIVE_PATH}
      title="Política de Privacidad y Tratamiento de Datos Personales"
      intro="Esta política describe cómo La Industria Bolera recolecta, usa, almacena y protege los datos personales de sus clientes y visitantes, en cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013 de la República de Colombia."
    >
      <section className="legal-section">
        <h2>1. Identificación del Responsable</h2>
        <p>
          <strong>Responsable del tratamiento:</strong> ENTRETENIMIENTO Y DIVERSIÓN S.A.S.,
          sociedad que opera el establecimiento comercial <strong>La Industria Bolera</strong>.
        </p>
        <ul>
          <li><strong>Razón social:</strong> ENTRETENIMIENTO Y DIVERSIÓN S.A.S.</li>
          <li><strong>NIT:</strong> 901.273.723-6</li>
          <li><strong>Establecimiento comercial:</strong> La Industria Bolera</li>
          <li><strong>Domicilio:</strong> Medellín, Antioquia, Colombia</li>
          <li><strong>Dirección:</strong> Carrera 70 # 1 – 141, Local 453, Arkadia Centro Comercial, Medellín</li>
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
        <h2>2. Definiciones legales</h2>
        <ul>
          <li>
            <strong>Autorización:</strong> consentimiento previo, expreso e informado del Titular para
            llevar a cabo el tratamiento de sus datos personales.
          </li>
          <li>
            <strong>Dato personal:</strong> cualquier información vinculada o que pueda asociarse a una
            o varias personas naturales determinadas o determinables.
          </li>
          <li>
            <strong>Dato sensible:</strong> aquel que afecta la intimidad del Titular o cuyo uso indebido
            puede generar discriminación (por ejemplo, datos de salud o biométricos).
          </li>
          <li>
            <strong>Encargado:</strong> persona natural o jurídica que realiza el tratamiento de datos
            personales por cuenta del Responsable.
          </li>
          <li>
            <strong>Responsable:</strong> persona natural o jurídica que decide sobre la base de datos y
            el tratamiento de los datos personales.
          </li>
          <li>
            <strong>Titular:</strong> persona natural cuyos datos personales son objeto de tratamiento.
          </li>
          <li>
            <strong>Tratamiento:</strong> cualquier operación sobre datos personales, como recolección,
            almacenamiento, uso, circulación o supresión.
          </li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>3. Principios para el tratamiento de datos personales</h2>
        <p>
          El tratamiento de datos personales se rige por los principios de legalidad, finalidad,
          libertad, veracidad o calidad, transparencia, acceso y circulación restringida, seguridad y
          confidencialidad, consagrados en el artículo 4 de la Ley 1581 de 2012.
        </p>
        <ul>
          <li><strong>Legalidad:</strong> el tratamiento se sujeta a la ley y a la autorización del Titular.</li>
          <li><strong>Finalidad:</strong> los datos se usan para finalidades determinadas, explícitas y legítimas.</li>
          <li><strong>Libertad:</strong> el tratamiento solo se realiza con el consentimiento previo del Titular.</li>
          <li><strong>Veracidad:</strong> la información debe ser veraz, completa, exacta y actualizada.</li>
          <li><strong>Transparencia:</strong> se garantiza el derecho del Titular a conocer el tratamiento de sus datos.</li>
          <li><strong>Seguridad y confidencialidad:</strong> se adoptan medidas técnicas y administrativas de protección.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>4. Datos personales recolectados</h2>
        <p>La Industria Bolera recolecta únicamente los datos necesarios para las siguientes interacciones:</p>
        <ul>
          <li>
            <strong>Reservas:</strong> nombres y apellidos, tipo y número de documento de identidad,
            teléfono, correo electrónico y fecha de nacimiento.
          </li>
          <li>
            <strong>Formulario de contacto:</strong> nombre, correo electrónico, asunto y contenido del
            mensaje.
          </li>
          <li>
            <strong>Pagos:</strong> los datos de tarjetas y medios de pago son procesados directamente por
            la pasarela <strong>PlaceToPay</strong>; La Industria Bolera no almacena números de tarjeta ni
            códigos de seguridad.
          </li>
          <li>
            <strong>Videovigilancia:</strong> imágenes captadas por el circuito cerrado de televisión
            (CCTV) instalado en las áreas comunes del establecimiento.
          </li>
        </ul>
        <p>
          La <strong>fecha de nacimiento</strong> se solicita de forma <strong>voluntaria</strong> y se
          utiliza <strong>únicamente</strong> para promociones, descuentos y cortesías de cumpleaños. No
          es un dato obligatorio para efectuar una reserva ni condiciona la prestación del servicio.
        </p>
      </section>

      <section className="legal-section">
        <h2>5. Finalidades del tratamiento</h2>
        <ul>
          <li>Gestionar, confirmar y administrar reservas de pistas, eventos y servicios.</li>
          <li>Emitir facturación y soportes contables conforme a la normatividad tributaria.</li>
          <li>Atender consultas, solicitudes, quejas y reclamos (atención al cliente).</li>
          <li>
            Enviar comunicaciones comerciales, promociones y novedades, únicamente cuando el Titular haya
            otorgado su autorización.
          </li>
          <li>
            Conocer la fecha de nacimiento, de forma exclusiva y cuando el Titular lo autorice, para
            otorgar promociones, descuentos y cortesías de cumpleaños.
          </li>
          <li>
            Garantizar la seguridad física de los visitantes, del personal y de los activos del
            establecimiento mediante videovigilancia.
          </li>
          <li>Cumplir obligaciones legales, contables y regulatorias aplicables.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>6. Tratamiento de datos de menores y datos sensibles</h2>
        <p>
          El tratamiento de datos de niños, niñas y adolescentes se realiza únicamente en el contexto de
          reservas y actividades de recreación familiar, bajo la representación, tutela y consentimiento
          expreso del adulto responsable (padres, tutores o adulto a cargo de la reserva). La Industria
          Bolera velará en todo momento por su <strong>interés superior</strong> y por sus derechos
          fundamentales, conforme al <strong>artículo 7 de la Ley 1581 de 2012</strong> y al{' '}
          <strong>artículo 12 del Decreto 1377 de 2013</strong>. El suministro de estos datos es
          facultativo para el adulto responsable.
        </p>
        <p>
          El tratamiento de datos sensibles es facultativo. El Titular no está obligado a autorizar su
          tratamiento y podrá ejercer sus derechos en cualquier momento.
        </p>
      </section>

      <section className="legal-section">
        <h2>7. Derechos de los titulares</h2>
        <p>De acuerdo con la Ley 1581 de 2012, el Titular tiene derecho a:</p>
        <ul>
          <li>Conocer, actualizar y rectificar sus datos personales.</li>
          <li>Solicitar prueba de la autorización otorgada, salvo cuando la ley exceptúe dicho requisito.</li>
          <li>Ser informado sobre el uso que se ha dado a sus datos personales.</li>
          <li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones.</li>
          <li>Revocar la autorización y/o solicitar la supresión de los datos, cuando no exista un deber legal o contractual de permanencia.</li>
          <li>Acceder de forma gratuita a sus datos personales objeto de tratamiento.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>8. Procedimiento para el ejercicio de derechos ARCO y PQR</h2>
        <p>
          El Titular puede ejercer sus derechos de acceso, rectificación, cancelación y oposición (ARCO),
          así como presentar peticiones, quejas y reclamos (PQR), a través de los siguientes canales:
        </p>
        <ul>
          <li>
            <strong>Correos electrónicos:</strong>{' '}
            <a href="mailto:entretenimientoydiversionsas@gmail.com">entretenimientoydiversionsas@gmail.com</a> y{' '}
            <a href="mailto:laindustriabolera@gmail.com">laindustriabolera@gmail.com</a>
          </li>
          <li><strong>WhatsApp de atención:</strong> (57) 311 354 0008</li>
          <li><strong>Teléfono fijo:</strong> (604) 604 3059</li>
          <li><strong>Presencial:</strong> Carrera 70 # 1 – 141, Local 453, Arkadia Centro Comercial, Medellín</li>
        </ul>
        <p>
          Conforme a los <strong>artículos 14 y 15 de la Ley 1581 de 2012</strong>, las consultas se
          atenderán en un término máximo de <strong>diez (10) días hábiles</strong> y los reclamos en un
          término máximo de <strong>quince (15) días hábiles</strong>. Estos plazos podrán prorrogarse
          conforme a la ley cuando existan circunstancias que lo justifiquen, informando al Titular los
          motivos de la prórroga.
        </p>
      </section>

      <section className="legal-section">
        <h2>9. Seguridad y almacenamiento de la información</h2>
        <p>
          La Industria Bolera adopta medidas técnicas, humanas y administrativas razonables para proteger
          los datos personales contra acceso no autorizado, pérdida, alteración, uso indebido o
          divulgación. El personal que interviene en el tratamiento está sujeto a deberes de
          confidencialidad.
        </p>
      </section>

      <section className="legal-section">
        <h2>10. Videovigilancia y circuito cerrado de televisión (CCTV)</h2>
        <p>
          El establecimiento cuenta con un circuito cerrado de televisión (CCTV) en sus instalaciones.
          Las imágenes captadas tienen como finalidad exclusiva el control interno, la prevención y la
          seguridad física de los visitantes, del personal y de los activos del establecimiento. Estas
          imágenes no se utilizan con fines comerciales ni publicitarios, se tratan bajo estrictos
          criterios de seguridad y confidencialidad, y solo podrán ser entregadas a autoridades
          competentes cuando medie requerimiento legal.
        </p>
      </section>

      <section className="legal-section">
        <h2>11. Transferencia y transmisión internacional de datos</h2>
        <p>
          La Industria Bolera <strong>no transfiere datos personales al exterior sin las debidas
          garantías de seguridad y confidencialidad</strong>. Cualquier transferencia o transmisión
          internacional se realizará únicamente a encargados o proveedores que ofrezcan niveles
          adecuados de protección y que se obliguen contractualmente a salvaguardar la información,
          conforme a la normatividad colombiana sobre protección de datos. Cuando se utilice
          infraestructura de servicios en la nube o la pasarela de pago <strong>PlaceToPay</strong> para
          procesar transacciones, dichos proveedores estarán sujetos a esas garantías de seguridad y
          confidencialidad.
        </p>
      </section>

      <section className="legal-section">
        <h2>12. Registro Nacional de Bases de Datos (RNBD)</h2>
        <p>
          Conforme al <strong>Decreto 090 de 2018</strong>, reglamentario de la Ley 1581 de 2012, la
          sociedad está clasificada como <strong>micro y pequeña empresa</strong>, por lo que se
          encuentra <strong>exceptuada de la obligación de inscribir sus bases de datos en el Registro
          Nacional de Bases de Datos (RNBD)</strong> ante la Superintendencia de Industria y Comercio
          (SIC). No obstante, La Industria Bolera mantiene su registro interno de bases de datos y
          continúa cumpliendo con las demás obligaciones legales en materia de protección de datos
          personales.
        </p>
      </section>

      <section className="legal-section">
        <h2>13. Vigencia de la política y de las bases de datos</h2>
        <p>
          Esta política rige a partir de su publicación y tiene vigencia indefinida. Las bases de datos
          asociadas permanecerán vigentes mientras se mantengan las finalidades descritas o mientras
          exista un deber legal o contractual de conservación. El Titular podrá revocar su autorización y
          solicitar la supresión de sus datos en cualquier momento.
        </p>
      </section>
    </LegalPageLayout>
  )
}
