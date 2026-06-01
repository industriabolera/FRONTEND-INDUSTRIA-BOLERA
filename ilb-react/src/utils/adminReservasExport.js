import { parseHorasFromString } from './bookingSlots'
import { slotsFromReserva } from './adminReservasGrid'

const METODOS_PAGO = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  bono_regalo: 'Bono de regalo',
  otro: 'Otro',
}

const ESTADO_EXPORT = {
  exitosa: 'Confirmada',
  pendiente: 'Pendiente',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada',
  manual: 'Manual',
}

/** Datos del cliente (columnas visibles al abrir el CSV). */
export const CLIENTE_CSV_HEADERS = [
  'Cliente (nombre)',
  'Celular',
  'Correo electrónico',
  'Tipo documento',
  'Número documento',
  'Fecha de cumpleaños',
]

/** Columnas de detalle de reserva (sin slot del plano). */
export const RESERVA_CSV_DETAIL_HEADERS = [
  'Referencia',
  ...CLIENTE_CSV_HEADERS,
  'Estado reserva',
  'Origen',
  'Fecha reserva',
  'Pistas',
  'Horarios',
  'Personas',
  'Método de pago',
  'Valor total (COP)',
  'Extras',
  'Descripción',
  'Notas',
  'Motivo pendiente',
  'Creada',
  'Actualizada',
]

/** Encabezado del export del plano del día (slot + detalle completo). */
export const PLANO_OCUPACION_CSV_HEADERS = [
  'Fecha',
  'Pista',
  'Hora',
  'Estado slot',
  'Detalle bloqueo',
  ...RESERVA_CSV_DETAIL_HEADERS,
]

export function escapeCsv(cell) {
  const s = String(cell ?? '')
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function downloadUtf8Csv(filename, rows) {
  const csv = rows.map(row => row.map(escapeCsv).join(',')).join('\r\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function metodoPagoExportLabel(value) {
  if (!value) return ''
  return METODOS_PAGO[value] || value
}

function formatDateTimeCsv(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function pistasResumen(r) {
  const slots = slotsFromReserva(r)
  if (slots.length) {
    const set = new Set(slots.map(s => s.pista))
    return Array.from(set).sort((a, b) => a - b).map(p => `P${p}`).join(', ')
  }
  if (r?.pistas != null && r.pistas !== '') return `P${r.pistas}`
  if (r?.pista != null) return `P${r.pista}`
  return ''
}

function horasResumen(r) {
  const slots = slotsFromReserva(r)
  if (slots.length) {
    const set = new Set(slots.map(s => s.hora))
    return Array.from(set).join(' · ')
  }
  return r?.horas || r?.hora || ''
}

function origenReserva(r) {
  if (r?.origen) return r.origen
  if (String(r?.reference || '').startsWith('MANUAL-')) return 'manual'
  if (String(r?.reference || '').startsWith('LOCAL-')) return 'manual'
  return 'online'
}

function motivoPendiente(r) {
  if (r?.motivoPendiente) return r.motivoPendiente
  if (r?.estado === 'pendiente') return r?.placetopay?.statusMessage || ''
  return ''
}

function emptyDetailCells() {
  return RESERVA_CSV_DETAIL_HEADERS.map(() => '')
}

/**
 * Normaliza datos del cliente desde reserva API, manual local o unified.
 * @param {object} source
 * @returns {{ nombre: string, celular: string, correo: string, tipoDocumento: string, documento: string, fechaCumpleanos: string }}
 */
export function extractDatosCliente(source) {
  if (!source) {
    return {
      nombre: '',
      celular: '',
      correo: '',
      tipoDocumento: '',
      documento: '',
      fechaCumpleanos: '',
    }
  }

  const dp = source.datosPersonales || source.datos_personales || {}
  const docJoined = typeof source.documento === 'string' ? source.documento.trim() : ''

  let tipoDocumento = dp.tipoDocumento || dp.tipo_documento || ''
  let documento = dp.documento || ''
  if (!documento && docJoined) {
    const parts = docJoined.split(/\s+/)
    if (parts.length > 1 && !tipoDocumento) {
      tipoDocumento = parts[0]
      documento = parts.slice(1).join(' ')
    } else {
      documento = docJoined
    }
  }

  const fechaCumpleanos =
    dp.fechaNacimiento ||
    dp.fecha_nacimiento ||
    dp.fechaCumpleanos ||
    dp.fecha_cumpleanos ||
    source.fechaNacimiento ||
    source.fechaCumpleanos ||
    ''

  return {
    nombre:
      dp.nombre ||
      source.nombre ||
      (source.cliente && source.cliente !== '—' ? source.cliente : '') ||
      '',
    celular:
      dp.telefono ||
      dp.celular ||
      dp.mobile ||
      source.telefono ||
      source.celular ||
      '',
    correo: dp.correo || dp.email || source.correo || source.email || '',
    tipoDocumento,
    documento,
    fechaCumpleanos,
  }
}

/** @returns {string[]} Celdas de CLIENTE_CSV_HEADERS */
export function clienteToCsvCells(source) {
  const c = extractDatosCliente(source)
  return [
    c.nombre,
    c.celular,
    c.correo,
    c.tipoDocumento,
    c.documento,
    c.fechaCumpleanos,
  ]
}

/**
 * @param {object|null|undefined} r Reserva API o merged para plano
 * @returns {string[]}
 */
export function reservaToCsvDetailCells(r) {
  if (!r) return emptyDetailCells()

  const cliente = extractDatosCliente(r)

  return [
    r.reference || '',
    cliente.nombre,
    cliente.celular,
    cliente.correo,
    cliente.tipoDocumento,
    cliente.documento,
    cliente.fechaCumpleanos,
    ESTADO_EXPORT[r.estado] || r.estado || '',
    origenReserva(r),
    r.fecha || '',
    pistasResumen(r),
    horasResumen(r),
    r.personas ?? '',
    metodoPagoExportLabel(r.metodoPago),
    r.total != null ? r.total : '',
    r.extras || '',
    r.description || '',
    r.notas || '',
    motivoPendiente(r),
    formatDateTimeCsv(r.creadaEn),
    formatDateTimeCsv(r.actualizadaEn),
  ]
}

/**
 * Fila de listado admin (objeto unified de AdminReservas).
 * @param {object} u
 * @returns {string[]}
 */
export function unifiedReservaToCsvRow(u) {
  const raw = u.raw || {}
  const cliente = extractDatosCliente({ ...raw, ...u })

  return [
    u.numero || '',
    cliente.nombre,
    cliente.celular,
    cliente.correo,
    cliente.tipoDocumento,
    cliente.documento,
    cliente.fechaCumpleanos,
    ESTADO_EXPORT[u.estado] || u.estado || '',
    u.origen === 'manual' ? 'manual' : 'online',
    u.fecha || '',
    u.pistasResumen || '',
    u.horasResumen || '',
    u.personas ?? '',
    metodoPagoExportLabel(u.metodoPago),
    u.valor != null ? u.valor : '',
    u.extras || '',
    u.descripcion || '',
    u.notas || '',
    raw.motivoPendiente || motivoPendiente(raw),
    formatDateTimeCsv(u.creadaEn),
    formatDateTimeCsv(u.actualizadaEn),
  ]
}

/**
 * @param {object[]} reservasList Lista unified de AdminReservas
 * @param {string} filename
 */
export function downloadReservasListCsv(reservasList, filename) {
  const rows = [
    RESERVA_CSV_DETAIL_HEADERS,
    ...reservasList.map(unifiedReservaToCsvRow),
  ]
  downloadUtf8Csv(filename, rows)
}
