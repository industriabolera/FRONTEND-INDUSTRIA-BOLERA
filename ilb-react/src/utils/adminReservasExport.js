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

/** Columnas de detalle de reserva (sin slot del plano). */
export const RESERVA_CSV_DETAIL_HEADERS = [
  'Referencia',
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
  'Cliente',
  'Teléfono',
  'Correo',
  'Tipo documento',
  'Documento',
  'Fecha nacimiento',
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
 * @param {object|null|undefined} r Reserva API o merged para plano
 * @returns {string[]}
 */
export function reservaToCsvDetailCells(r) {
  if (!r) return emptyDetailCells()

  const dp = r.datosPersonales || {}

  return [
    r.reference || '',
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
    dp.nombre || r.nombre || '',
    dp.telefono || r.telefono || '',
    dp.correo || '',
    dp.tipoDocumento || '',
    dp.documento || '',
    dp.fechaNacimiento || '',
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
  const dp = raw.datosPersonales || {}
  const docTipo = dp.tipoDocumento || (u.documento ? u.documento.split(' ')[0] : '')
  const docNum = dp.documento || (u.documento ? u.documento.replace(/^\S+\s*/, '') : '')

  return [
    u.numero || '',
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
    u.cliente && u.cliente !== '—' ? u.cliente : (dp.nombre || raw.nombre || ''),
    u.telefono || dp.telefono || '',
    u.correo || dp.correo || '',
    docTipo,
    docNum,
    u.fechaNacimiento || dp.fechaNacimiento || '',
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
