import { parseSlots } from './reserva-availability.js'
import { isWeekendOrHolidayColombia, parseFechaYmdLocal } from './colombia-holidays-shared.js'

export function parseExtrasPricing(extras) {
  const s = String(extras || '')
  let zapatosQty = 0
  let jugadorExtraCobro = 0
  const zm = s.match(/Zapatos x(\d+)/i)
  if (zm) zapatosQty = Math.max(0, parseInt(zm[1], 10) || 0)
  if (/Jugador adicional/i.test(s)) {
    if (/promo 2×1|2×1/i.test(s)) jugadorExtraCobro = 1
    else {
      const matches = s.match(/Pista \d+/gi)
      jugadorExtraCobro = matches?.length || 1
    }
  }
  return { zapatosQty, jugadorExtraCobro }
}

export function getActivePromo(promociones, fechaStr, dayOfWeek) {
  return (promociones || []).find(p => {
    if (!p?.activa) return false
    if (fechaStr < p.fechaInicio || fechaStr > p.fechaFin) return false
    if (Array.isArray(p.diasSemana) && p.diasSemana.length > 0 && !p.diasSemana.includes(dayOfWeek)) return false
    return true
  }) || null
}

/**
 * Calcula el total esperado de una reserva (misma lógica que el checkout).
 * @returns {{ ok: true, total: number } | { ok: false, error: string }}
 */
export function computeBookingTotal({ config, fecha, hora, personas, extras }) {
  if (!config?.precios) return { ok: false, error: 'Configuración de precios no disponible' }

  const slots = parseSlots(fecha, hora)
  if (!slots.length) return { ok: false, error: 'Datos de pista / horario inválidos' }

  const totalHorasReservadas = slots.length
  const numPistas = new Set(slots.map(s => s.pista)).size
  const { zapatosQty, jugadorExtraCobro } = parseExtrasPricing(extras)
  const personasNum = Number(personas)

  const maxBase = numPistas <= 1 ? 6 : 6 * numPistas
  if (!Number.isFinite(personasNum) || personasNum < 1) {
    return { ok: false, error: 'Número de personas inválido' }
  }
  if (personasNum > maxBase + jugadorExtraCobro) {
    return { ok: false, error: `Máximo ${maxBase} personas base (+ extras permitidos)` }
  }
  if (zapatosQty > personasNum) {
    return { ok: false, error: 'Cantidad de zapatos inválida' }
  }

  const precios = config.precios
  const dateObj = parseFechaYmdLocal(fecha)
  const vd = isWeekendOrHolidayColombia(fecha)
  const precioPistaBase = vd ? Number(precios.pistaVD) : Number(precios.pistaLJ)

  const activePromo = getActivePromo(config.promociones, fecha, dateObj.getDay())
  const promo2x1Active = activePromo?.tipo === '2x1' && totalHorasReservadas >= (activePromo.minHoras || 2)

  let precioPista = precioPistaBase
  if (activePromo?.tipo === 'porcentaje') {
    precioPista = Math.round(precioPistaBase * (1 - activePromo.valor / 100))
  } else if (activePromo?.tipo === 'valor') {
    precioPista = Math.max(0, precioPistaBase - activePromo.valor)
  }

  const horasFacturables = promo2x1Active
    ? Math.ceil(totalHorasReservadas / 2)
    : totalHorasReservadas

  const totalPistasCost = promo2x1Active
    ? precioPistaBase * horasFacturables
    : precioPista * totalHorasReservadas

  const precioZapatos = zapatosQty > 0 ? Number(precios.zapatos) * zapatosQty : 0
  const precioJugador = jugadorExtraCobro > 0 ? Number(precios.jugadorAdicional) * jugadorExtraCobro : 0
  const total = Math.round(totalPistasCost + precioZapatos + precioJugador)

  return { ok: true, total }
}
