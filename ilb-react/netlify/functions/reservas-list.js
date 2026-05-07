import { getReservasCollection } from './lib/db.js'
import {
  defaultFechaDesdeMesAnterior,
  FECHA_YMD_QUERY_RE,
  mapReservaDocToListRow,
  buildReservaListFilter,
} from './lib/reservas-list-shared.js'

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const q = event.queryStringParameters || {}

    let fechaDesde = q.fechaDesde
    if (fechaDesde === undefined || fechaDesde === null || fechaDesde === '') {
      fechaDesde = defaultFechaDesdeMesAnterior()
    } else if (!FECHA_YMD_QUERY_RE.test(String(fechaDesde))) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'fechaDesde debe ser YYYY-MM-DD' }),
      }
    } else {
      fechaDesde = String(fechaDesde)
    }

    const rawSkip = Number.parseInt(String(q.skip ?? ''), 10)
    const skip = Number.isFinite(rawSkip) && rawSkip >= 0 ? Math.min(rawSkip, 500000) : 0

    const rawLim = Number.parseInt(String(q.limit ?? ''), 10)
    const limit = Number.isFinite(rawLim)
      ? Math.min(Math.max(rawLim, 1), 500)
      : 250

    const filter = buildReservaListFilter(fechaDesde)
    const reservas = await getReservasCollection()
    const docs = await reservas
      .find(filter)
      .sort({ creadaEn: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const list = docs.map(mapReservaDocToListRow)
    const hasMore = docs.length === limit

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reservas: list,
        hasMore,
        fechaDesde,
        skip,
        limit,
      }),
    }
  } catch (err) {
    console.error('[Reservas] List error:', err.message)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    }
  }
}
