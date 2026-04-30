/* eslint-disable no-console */
import PDFDocument from 'pdfkit'
import { createWriteStream, existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

function imageSize(p) {
  const buf = readFileSync(p)
  if (buf[0] === 0x89 && buf[1] === 0x50) {
    const w = buf.readUInt32BE(16)
    const h = buf.readUInt32BE(20)
    return { width: w, height: h }
  }
  return { width: 1, height: 1 }
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const IMG = resolve(__dirname, 'manual-images')
const OUT_PDF = resolve(__dirname, '..', 'public', 'documents', 'Manual-Admin-La-Industria-Bolera.pdf')

const COLORS = {
  bg: '#ffffff',
  ink: '#1a1a1a',
  mute: '#5a5a5a',
  brand: '#a8853e',
  brandDark: '#7a5e23',
  accent: '#cf4a3c',
  panel: '#f7f3eb',
  border: '#e6dfcf',
}

const FONT = {
  body: 'Helvetica',
  bold: 'Helvetica-Bold',
  italic: 'Helvetica-Oblique',
}

function img(name) {
  const p = resolve(IMG, name)
  return existsSync(p) ? p : null
}

class Manual {
  constructor() {
    this.doc = new PDFDocument({
      size: 'A4',
      margins: { top: 64, bottom: 64, left: 56, right: 56 },
      bufferPages: true,
      info: {
        Title: 'Manual Panel Administrador — La Industria Bolera',
        Author: 'La Industria Bolera',
        Subject: 'Guía de uso del portal administrador',
      },
    })
    this.doc.pipe(createWriteStream(OUT_PDF))
  }

  addPage() {
    this.doc.addPage()
  }

  // Dibuja header/footer en todas las páginas excepto la portada,
  // pero se ejecuta una sola vez al final, fuera del flujo normal.
  paintHeadersAndFooters() {
    const { doc } = this
    const range = doc.bufferedPageRange()
    const totalPages = range.count
    for (let i = range.start; i < range.start + totalPages; i++) {
      doc.switchToPage(i)
      if (i === 0) continue
      const W = doc.page.width
      const H = doc.page.height
      doc.save()
      doc.font(FONT.body).fontSize(9).fillColor(COLORS.mute)
      doc.text('Manual Panel Administrador · La Industria Bolera', 56, 28, {
        width: W - 112, align: 'left', lineBreak: false, height: 14,
      })
      doc.text(`Página ${i + 1} de ${totalPages}`, 56, 28, {
        width: W - 112, align: 'right', lineBreak: false, height: 14,
      })
      doc.moveTo(56, 44).lineTo(W - 56, 44).strokeColor(COLORS.border).lineWidth(0.5).stroke()
      doc.fontSize(8).fillColor(COLORS.mute)
      doc.text('laindustriabolera.co/admin', 56, H - 36, {
        width: W - 112, align: 'left', lineBreak: false, height: 12,
      })
      doc.text('© 2026 La Industria Bolera', 56, H - 36, {
        width: W - 112, align: 'right', lineBreak: false, height: 12,
      })
      doc.restore()
    }
  }

  cover() {
    const { doc } = this
    const W = doc.page.width
    const H = doc.page.height

    doc.rect(0, 0, W, H).fill('#0d0d0d')
    doc.rect(0, 0, W, 220).fill('#161616')
    doc.fillColor(COLORS.brand).rect(0, 220, W, 6).fill()

    if (img('LogoIndustriaBolera_Color-300x192.png')) {
      // optional brand logo
    }
    doc.fillColor('#e4d28d').font(FONT.bold).fontSize(34)
    doc.text('Manual del Panel', 56, 280, { align: 'left' })
    doc.fontSize(34).text('Administrador', 56, doc.y, { align: 'left' })

    doc.moveDown(0.4)
    doc.fillColor('#ffffff').font(FONT.body).fontSize(16)
    doc.text('La Industria Bolera', 56, doc.y, { align: 'left' })

    doc.moveDown(2)
    doc.fontSize(12).fillColor('#cccccc')
    doc.text('Guía completa para gestionar reservas, pistas, precios y promociones desde el portal de administración.', 56, doc.y, {
      width: W - 112, align: 'left',
    })

    doc.moveDown(6)
    doc.fontSize(11).fillColor('#999999')
    doc.text('Acceso al portal', 56, doc.y)
    doc.fillColor('#e4d28d').font(FONT.bold).fontSize(13)
    doc.text('https://laindustriabolera.co/admin', 56, doc.y + 4)
    doc.moveDown(0.4)
    doc.font(FONT.body).fontSize(11).fillColor('#999999').text('Contraseña actual:', 56, doc.y)
    doc.fillColor('#e4d28d').font(FONT.bold).fontSize(13).text('bolera2026', 56, doc.y + 4)

    doc.moveDown(8)
    doc.fontSize(10).fillColor('#777777').text('Versión Abril 2026', 56, H - 100)
  }

  h1(text) {
    const { doc } = this
    doc.moveDown(0.4)
    doc.font(FONT.bold).fontSize(22).fillColor(COLORS.brand)
    doc.text(text, { align: 'left' })
    doc.moveTo(doc.page.margins.left, doc.y + 4)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y + 4)
      .strokeColor(COLORS.brand).lineWidth(1.5).stroke()
    doc.moveDown(1)
  }

  h2(text) {
    const { doc } = this
    doc.moveDown(0.6)
    doc.font(FONT.bold).fontSize(15).fillColor(COLORS.brandDark)
    doc.text(text, { align: 'left' })
    doc.moveDown(0.4)
  }

  h3(text) {
    const { doc } = this
    doc.moveDown(0.4)
    doc.font(FONT.bold).fontSize(12).fillColor(COLORS.ink)
    doc.text(text, { align: 'left' })
    doc.moveDown(0.2)
  }

  p(text, opts = {}) {
    const { doc } = this
    doc.font(FONT.body).fontSize(10.5).fillColor(COLORS.ink)
    doc.text(text, { align: opts.align || 'justify', lineGap: 2 })
  }

  bullets(items) {
    const { doc } = this
    doc.font(FONT.body).fontSize(10.5).fillColor(COLORS.ink)
    items.forEach((it) => {
      doc.text(`•  ${it}`, { indent: 8, lineGap: 2, align: 'left' })
    })
    doc.moveDown(0.4)
  }

  callout(title, text) {
    const { doc } = this
    const x = doc.page.margins.left
    const w = doc.page.width - doc.page.margins.left - doc.page.margins.right
    const startY = doc.y
    doc.font(FONT.bold).fontSize(11).fillColor(COLORS.brandDark)
    const boxText = `${title}\n`
    const titleH = doc.heightOfString(boxText, { width: w - 28 })
    doc.font(FONT.body).fontSize(10).fillColor(COLORS.ink)
    const bodyH = doc.heightOfString(text, { width: w - 28, lineGap: 2 })
    const totalH = titleH + bodyH + 22

    doc.save()
    doc.rect(x, startY, w, totalH).fillColor(COLORS.panel).fill()
    doc.rect(x, startY, 4, totalH).fillColor(COLORS.brand).fill()
    doc.restore()

    doc.font(FONT.bold).fontSize(11).fillColor(COLORS.brandDark)
    doc.text(title, x + 14, startY + 10, { width: w - 28 })
    doc.font(FONT.body).fontSize(10).fillColor(COLORS.ink)
    doc.text(text, x + 14, doc.y + 2, { width: w - 28, lineGap: 2 })

    doc.y = startY + totalH + 8
  }

  caption(text) {
    const { doc } = this
    doc.font(FONT.italic).fontSize(9).fillColor(COLORS.mute)
    doc.text(text, { align: 'center' })
    doc.moveDown(0.6)
  }

  image(name, opts = {}) {
    const { doc } = this
    const p = img(name)
    if (!p) return
    const margins = doc.page.margins
    const fullW = doc.page.width - margins.left - margins.right
    const targetW = opts.width ?? fullW
    const x = opts.center !== false && targetW < fullW
      ? margins.left + (fullW - targetW) / 2
      : margins.left

    const meta = imageSize(p)
    const naturalRatio = meta.height / meta.width
    const naturalH = targetW * naturalRatio
    const targetH = opts.height ?? Math.min(naturalH, opts.maxHeight ?? 460)

    let availableH = doc.page.height - margins.bottom - doc.y - (opts.captionReserve || 30)
    if (availableH < targetH + 4) {
      this.addPage()
      availableH = doc.page.height - margins.bottom - doc.y - (opts.captionReserve || 30)
    }
    const finalH = Math.min(targetH, availableH)
    const finalW = naturalRatio > 0 ? finalH / naturalRatio : targetW
    const drawW = Math.min(finalW, targetW)
    const drawH = drawW * naturalRatio
    const drawX = x + (targetW - drawW) / 2

    doc.save()
    if (opts.border !== false) {
      doc.rect(drawX - 1, doc.y - 1, drawW + 2, drawH + 2).strokeColor(COLORS.border).lineWidth(0.5).stroke()
    }
    doc.restore()
    doc.image(p, drawX, doc.y, { width: drawW, height: drawH })
    doc.y += drawH + 8
  }

  end() {
    this.paintHeadersAndFooters()
    this.doc.end()
  }
}

function build() {
  const m = new Manual()

  // ───────── COVER ─────────
  m.cover()

  // ───────── INTRODUCCIÓN ─────────
  m.addPage()
  m.h1('1. Introducción')
  m.p('Bienvenido al manual del Panel Administrador de La Industria Bolera. Esta herramienta web te permite controlar todo el negocio digital de la bolera: revisar reservas confirmadas y pendientes, ajustar precios y horarios, crear promociones, bloquear pistas para mantenimiento o eventos, y registrar reservas manuales por teléfono o WhatsApp.')
  m.p('Todos los cambios se aplican en tiempo real sobre la página pública de reservas. No es necesario reiniciar el servidor ni publicar nada manualmente.')

  m.h2('1.1. ¿Qué encontrarás en este manual?')
  m.bullets([
    'Cómo entrar al panel y cuál es la contraseña.',
    'Recorrido por las cinco pestañas: Dashboard, Precios, Promociones, Pistas y Reservas.',
    'Pasos detallados para cada acción: crear bloqueos, agregar reservas manuales, configurar promociones, ajustar precios y horarios.',
    'Buenas prácticas y recomendaciones de seguridad.',
  ])

  m.h2('1.2. Requisitos')
  m.bullets([
    'Conexión a Internet.',
    'Navegador moderno (Chrome, Safari, Edge o Firefox).',
    'La contraseña del panel (compartida solo con el equipo autorizado).',
  ])

  m.callout('Importante', 'Cualquier cambio en Precios, Promociones, Pistas o Reservas Manuales se publica de inmediato en la web pública. Revisa siempre lo que vas a guardar antes de hacer clic en “Guardar”.')

  // ───────── 2. ACCESO ─────────
  m.addPage()
  m.h1('2. Acceso al portal')
  m.p('El portal de administración se encuentra en una URL privada que sólo deben conocer las personas autorizadas:')
  m.callout('Dirección y contraseña', 'URL:  https://laindustriabolera.co/admin\n\nContraseña actual:  bolera2026')

  m.h2('2.1. Pantalla de inicio de sesión')
  m.p('Al ingresar a la dirección, verás una tarjeta oscura con el logo de La Industria Bolera y el título “Panel Administrador”. Debajo encontrarás un campo de contraseña y el botón “Ingresar”.')
  m.image('01-login.png')
  m.caption('Figura 2.1 — Pantalla de inicio de sesión del panel.')

  m.addPage()
  m.h2('2.2. Cómo iniciar sesión')
  m.bullets([
    'Escribe la contraseña en el campo (se muestra como puntos por seguridad).',
    'Pulsa el botón rojo “Ingresar”.',
    'Si la contraseña es incorrecta verás el mensaje “Contraseña incorrecta”. Vuelve a intentarlo.',
    'Una vez dentro, la sesión se mantiene mientras la pestaña esté abierta. Si cierras el navegador deberás volver a iniciar sesión.',
  ])
  m.image('01b-login-typed.png', { width: 380 })
  m.caption('Figura 2.2 — Tarjeta de login con la contraseña ingresada.')

  m.h2('2.3. Cerrar sesión')
  m.p('En la barra lateral hay un botón rojo “Cerrar sesión” en la parte inferior. Úsalo siempre que termines de trabajar, especialmente si compartes el computador.')

  m.callout('Recomendaciones de seguridad', 'No compartas la contraseña por correo, redes sociales o chats. Cámbiala periódicamente coordinando con el equipo de desarrollo. Si sospechas que alguien no autorizado la conoce, solicita un cambio inmediato.')

  // ───────── 3. ESTRUCTURA ─────────
  m.addPage()
  m.h1('3. Estructura del panel')
  m.p('Una vez dentro, la pantalla está dividida en dos zonas principales:')
  m.bullets([
    'Barra lateral izquierda (sidebar): contiene las cinco pestañas principales y el botón de cerrar sesión.',
    'Área central de trabajo: aquí se carga el contenido de cada pestaña con sus acciones, formularios y listados.',
  ])
  m.h2('3.1. Pestañas disponibles')
  m.bullets([
    'Dashboard — Resumen y listado de todas las reservas con filtros y búsqueda.',
    'Precios — Configura los precios base y los horarios de operación.',
    'Promociones — Crea, activa y elimina ofertas (porcentaje, valor fijo o 2×1).',
    'Pistas — Bloquea pistas individuales o por rango de fechas (mantenimiento, eventos privados).',
    'Reservas — Lista unificada de reservas online y manuales, con detalle expandible y formulario para crear reservas a mano.',
  ])
  m.image('02-dashboard.png')
  m.caption('Figura 3.1 — Vista general del panel con la barra lateral y el Dashboard activo.')

  // ───────── 4. DASHBOARD ─────────
  m.addPage()
  m.h1('4. Dashboard')
  m.p('El Dashboard es la primera pantalla que aparece al iniciar sesión. Sirve para tener un panorama rápido del negocio y consultar cualquier reserva.')

  m.h2('4.1. Tarjetas de resumen')
  m.p('En la parte superior se muestran cuatro tarjetas:')
  m.bullets([
    'Total Reservas — número total de reservas registradas en el sistema.',
    'Confirmadas — reservas con pago aprobado por la pasarela PlaceToPay.',
    'Pendientes — reservas en proceso de pago, sin confirmación final.',
    'Ingresos Confirmados — suma en pesos colombianos de las reservas confirmadas.',
  ])
  m.image('02-dashboard.png')
  m.caption('Figura 4.1 — Dashboard con las tarjetas de estadísticas y el listado de reservas.')

  m.addPage()
  m.h2('4.2. Buscador y filtros')
  m.p('Debajo de las tarjetas hay una barra de herramientas:')
  m.bullets([
    'Buscador: filtra por nombre, referencia, documento, correo o fecha. Escribe y la lista se actualiza al instante.',
    'Filtros por estado: Todas, Confirmada, Pendiente, Rechazada o Cancelada. Cada botón muestra cuántas reservas hay en ese estado.',
    'Botón “Actualizar” (icono de refresco): vuelve a consultar la base de datos. El listado también se refresca automáticamente cada 15 segundos.',
  ])

  m.h2('4.3. Tabla de reservas')
  m.p('La tabla muestra columnas con: referencia (ID único de la reserva), fecha de la reserva, responsable (cliente que reservó), pistas reservadas, total, estado y fecha de creación.')
  m.p('Cada fila tiene un chevron a la derecha. Al hacer clic se expande mostrando todos los detalles de la reserva y los datos del cliente.')
  m.image('02b-dashboard-detail.png')
  m.caption('Figura 4.2 — Reserva expandida con detalle de pistas, horarios, total y datos del cliente.')

  m.callout('Tip', 'Para encontrar rápidamente una reserva por número de referencia, copia la referencia desde un correo o desde el comprobante del cliente y pégala en el buscador.')

  // ───────── 5. PRECIOS ─────────
  m.addPage()
  m.h1('5. Precios y horarios')
  m.p('La pestaña “Precios” permite configurar los valores que se aplican automáticamente en la página pública de reservas. También define los horarios de apertura y cierre que se ofrecen al cliente.')

  m.h2('5.1. Precios base')
  m.bullets([
    'Pista Lunes – Jueves: precio por hora de pista en días entre semana.',
    'Pista Viernes – Domingo: precio por hora de pista en fin de semana y festivos.',
    'Zapatos y Medias: cargo por persona (se suma según número de jugadores).',
    'Jugador Adicional: costo del séptimo jugador cuando una pista lleva grupos grandes.',
  ])
  m.p('Para cambiar un precio, simplemente edita el número y pulsa “Guardar Precios”. Aparecerá un mensaje verde “Precios actualizados” confirmando el cambio.')
  m.image('03-precios.png')
  m.caption('Figura 5.1 — Formulario de precios y horarios con los valores actuales de la bolera.')

  m.addPage()
  m.h2('5.2. Horarios de operación')
  m.p('Debajo de los precios se configura la apertura y cierre por bloque de días:')
  m.bullets([
    'Lunes – Miércoles',
    'Jueves – Sábado',
    'Domingos y Festivos',
  ])
  m.p('La página pública genera automáticamente los espacios disponibles entre la hora de apertura y la de cierre. Si cambias estos horarios, la página de reservas reflejará la nueva ventana inmediatamente.')

  m.callout('Buenas prácticas', 'Si vas a hacer cambios masivos (por ejemplo subir todos los precios), avisa al equipo y verifica el resultado en la página pública (sección Reservas) antes de cerrar el panel. El cambio es instantáneo.')

  // ───────── 6. PROMOCIONES ─────────
  m.addPage()
  m.h1('6. Promociones')
  m.p('Las promociones son descuentos que se aplican automáticamente en la página de reservas cuando el cliente cumple las condiciones definidas (rango de fechas, días de la semana y tipo de descuento).')
  m.image('04-promociones.png')
  m.caption('Figura 6.1 — Pestaña de Promociones sin promociones cargadas.')

  m.h2('6.1. Cómo crear una promoción')
  m.bullets([
    'Pulsa el botón rojo “Nueva Promoción”. Se abrirá un formulario.',
    'Nombre interno (ej.: “Martes 2×1 Febrero”).',
    'Descripción visible para el cliente (ej.: “Juega 2 horas o 1 hora en 2 pistas”).',
    'Tipo de descuento: % de descuento, $ descuento fijo, o 2×1 en pistas.',
    'Valor o mínimo de horas según el tipo seleccionado.',
    'Fecha Inicio y Fecha Fin (la promoción solo aplica entre esas fechas).',
    'Días de la semana: marca los días en que aplica. Si no marcas ninguno, aplica todos los días dentro del rango.',
    'Pulsa “Crear Promoción”. Aparecerá en la lista inferior.',
  ])

  m.addPage()
  m.image('04b-promociones-form.png')
  m.caption('Figura 6.2 — Formulario de nueva promoción con todos los campos disponibles.')

  m.h2('6.2. Tipos de descuento')
  m.bullets([
    '% de descuento — resta un porcentaje del total (ej.: 15 % de descuento).',
    '$ descuento fijo — resta un valor en pesos (ej.: $20.000).',
    '2×1 en pistas — por cada 2 horas reservadas el cliente paga sólo 1. Aplica también para 1 hora en 2 pistas distintas. Se activa al alcanzar el “mínimo de horas” que definiste.',
  ])

  m.h2('6.3. Activar, desactivar y eliminar')
  m.p('Cada promoción aparece como una tarjeta. A la derecha hay dos botones:')
  m.bullets([
    'Toggle (interruptor) — activa o desactiva la promoción sin perder la configuración.',
    'Papelera — elimina la promoción permanentemente.',
  ])
  m.callout('Recomendación', 'Es mejor desactivar la promoción al final del periodo (toggle apagado) que eliminarla, así puedes reactivarla en una próxima campaña sin volver a configurarla.')

  // ───────── 7. PISTAS ─────────
  m.addPage()
  m.h1('7. Bloqueo de pistas')
  m.p('Cuando una pista no estará disponible (mantenimiento, evento privado, daño, etc.) puedes bloquearla desde aquí. Las pistas bloqueadas se muestran como ocupadas en la página pública y no podrán reservarse en línea.')
  m.image('05-pistas.png')
  m.caption('Figura 7.1 — Pestaña Pistas con la lista de bloqueos vigentes y los filtros por fecha, hora o pista.')

  m.h2('7.1. Crear un nuevo bloqueo')
  m.bullets([
    'Pulsa el botón rojo “Bloquear Pista”.',
    'Selecciona Fecha Inicio y Fecha Fin del bloqueo (puede ser un solo día).',
    'En el plano interactivo, haz clic sobre cada pista que quieras bloquear (puedes elegir varias).',
    'Elige “Todo el día” o “Horarios específicos” y, si es lo segundo, marca las horas a bloquear.',
    'Escribe un Motivo opcional (ej.: “Mantenimiento canales”, “Evento privado banco XYZ”).',
    'Verás un resumen automático con cuántos bloqueos se crearán. Pulsa “Crear Bloqueo”.',
  ])

  m.addPage()
  m.image('05b-pistas-bloquear.png')
  m.caption('Figura 7.2 — Formulario para crear un nuevo bloqueo de pistas.')

  m.image('05c-pistas-plano.png')
  m.caption('Figura 7.3 — Plano interactivo con las 11 pistas, las máquinas de pines y la zona del restaurante / isla de bebidas. Haz clic en una pista para seleccionarla.')

  m.addPage()
  m.h2('7.2. Filtrar y revisar bloqueos existentes')
  m.p('La sección inferior de la pestaña Pistas lista todos los bloqueos vigentes. Puedes filtrar por:')
  m.bullets([
    'Fecha — muestra los bloqueos que cubren esa fecha.',
    'Hora — muestra los bloqueos que afectan esa hora específica.',
    'Pista — filtra por número de pista (1 a 11).',
    'Botón “Limpiar” — quita todos los filtros.',
  ])
  m.p('Cada bloqueo se muestra como una tarjeta con la pista, el rango de fechas, las horas afectadas y el motivo. A la derecha hay un botón rojo de papelera para eliminarlo cuando ya no aplique.')

  m.callout('Atención', 'Eliminar un bloqueo no avisa a nadie y la pista volverá a estar disponible inmediatamente para nuevas reservas. Si la pista sigue inhabilitada físicamente, no elimines el bloqueo todavía.')

  // ───────── 8. RESERVAS ─────────
  m.addPage()
  m.h1('8. Reservas (lista completa y reservas manuales)')
  m.p('Esta pestaña reúne todas las reservas online (creadas desde la página pública con pago por PlaceToPay) y las reservas manuales (creadas por ti desde el panel para clientes que llaman, escriben por WhatsApp o llegan en persona).')
  m.image('06-reservas.png')
  m.caption('Figura 8.1 — Listado de reservas agrupadas por fecha. Muestra origen, estado y datos clave de cada reserva.')

  m.h2('8.1. Buscar y filtrar')
  m.bullets([
    'Buscador — filtra por número de reserva, nombre, teléfono, correo, documento o fecha.',
    'Filtros por estado — Todas, Confirmada, Pendiente, Rechazada, Cancelada o Manual. Cada botón muestra el conteo.',
    'Botón “Actualizar” — refresca el listado. También se actualiza automáticamente cada 20 segundos.',
  ])

  m.h2('8.2. Ver el detalle de una reserva')
  m.p('Haz clic sobre cualquier tarjeta. Se expandirá mostrando dos columnas:')
  m.bullets([
    'Detalle de la reserva — número, fecha, pistas, horarios, personas, extras, valor total, estado, origen y fechas de creación / actualización.',
    'Datos del cliente — nombre, teléfono, correo, documento y fecha de nacimiento (cuando aplica).',
  ])
  m.image('06b-reservas-detalle.png')
  m.caption('Figura 8.2 — Reserva expandida con los detalles del cliente y del pago.')

  m.addPage()
  m.h2('8.3. Crear una reserva manual')
  m.p('Cuando un cliente reserva por teléfono o WhatsApp y paga en efectivo o por transferencia, puedes registrar la reserva a mano:')
  m.bullets([
    'Pulsa “Nueva Reserva”.',
    'Llena Nombre y Teléfono del cliente.',
    'Selecciona Pista (1 a 11), Fecha y Hora. Sólo se mostrarán las horas disponibles para esa pista (excluyendo bloqueos).',
    'Indica número de Personas (1 a 7) y agrega Notas si quieres (ej.: “Cumpleaños, llevan torta”).',
    'Pulsa “Crear Reserva”. Aparecerá en el listado con la etiqueta gris “Manual”.',
  ])
  m.image('06c-reservas-form.png')
  m.caption('Figura 8.3 — Formulario para registrar una reserva manual desde el panel.')

  m.h2('8.4. Eliminar una reserva manual')
  m.p('Las reservas manuales tienen un botón rojo “Eliminar” en su detalle expandido. Las reservas online (con estado Confirmada, Pendiente, Rechazada o Cancelada) no se pueden eliminar desde el panel para preservar el registro de pagos.')

  m.callout('Importante', 'Las reservas manuales NO bloquean automáticamente la pista para reservas online en esa fecha y hora. Si ya cobraste por una franja, conviene además crear un bloqueo desde la pestaña Pistas para evitar dobles reservas.')

  // ───────── 9. ESTADOS ─────────
  m.addPage()
  m.h1('9. Estados de las reservas')
  m.p('Cada reserva online pasa por uno de estos estados. Reconocerlos te ayudará a interpretar el listado:')
  m.bullets([
    'Pendiente (naranja) — la pasarela PlaceToPay aún no ha confirmado el pago. Puede pasar a Confirmada o Rechazada en minutos.',
    'Confirmada (verde) — el pago fue aprobado. La reserva es válida y la pista está reservada.',
    'Rechazada (rojo) — el pago fue rechazado por el banco. La pista vuelve a estar disponible.',
    'Cancelada (gris) — la reserva fue cancelada (por el cliente, por tiempo de pago expirado o de forma administrativa).',
    'Manual (gris con ícono de escudo) — reserva creada desde el panel; no pasó por la pasarela.',
  ])

  m.h2('9.1. ¿Qué hacer ante un caso especial?')
  m.bullets([
    'Reserva pendiente que no avanza: espera unos minutos. Si pasa el tiempo y sigue pendiente, contacta al cliente para verificar el estado del pago.',
    'Reserva rechazada con cliente que insiste: pídele que reintente desde la página pública. Si vuelve a fallar, ofrece reservar manualmente y cobrar por otro medio.',
    'Reserva confirmada que el cliente quiere cancelar: contáctate con el equipo de desarrollo para registrar la devolución, ya que el panel no procesa reembolsos automáticos.',
  ])

  // ───────── 10. CONSEJOS ─────────
  m.addPage()
  m.h1('10. Buenas prácticas y solución de problemas')
  m.h2('10.1. Buenas prácticas')
  m.bullets([
    'Cierra sesión al terminar, especialmente si trabajas en un computador compartido.',
    'Antes de cambiar precios o promociones a “producción real”, valida con el equipo de marketing y atención al cliente.',
    'Usa el campo “Motivo” al bloquear pistas: facilita revisar el historial cuando alguien pregunte por qué una pista no estuvo disponible.',
    'Para eventos grandes, bloquea las pistas con varios días de anticipación para evitar que alguien reserve antes.',
  ])

  m.h2('10.2. Problemas frecuentes')
  m.bullets([
    'No me deja entrar — verifica que la contraseña esté escrita correctamente y que no haya espacios extra.',
    'No veo nuevas reservas — pulsa el botón de refresco. La página también se actualiza sola cada 15-20 segundos.',
    'El cliente dice que pagó pero no aparece — espera 1-2 minutos y vuelve a refrescar. PlaceToPay puede tardar en notificar.',
    'No puedo crear una promoción — revisa que tengas Nombre, Fecha Inicio y Fecha Fin completos.',
  ])

  m.h2('10.3. Soporte')
  m.p('Para cambios estructurales (nuevos campos, integraciones, cambios de precio masivos automatizados, devoluciones), contacta al equipo de desarrollo responsable del proyecto. Conserva siempre la contraseña en un gestor seguro y compártela únicamente con personal autorizado.')

  m.callout('Resumen rápido', 'URL: https://laindustriabolera.co/admin\nContraseña: bolera2026\n\nEl panel está dividido en cinco pestañas: Dashboard, Precios, Promociones, Pistas y Reservas. Todos los cambios son instantáneos en la página pública. Cierra sesión al terminar.')

  m.end()
  console.log('✔ PDF generado en', OUT_PDF)
}

build()
