import { getReservasCollection, getAdminUsersCollection } from './lib/db.js'
import { requireAuthAsync } from './lib/admin-auth.js'
import { apiErrorMessage, jsonResponse } from './lib/http-security.js'
import {
  defaultFechaDesdeMesAnterior,
  FECHA_YMD_QUERY_RE,
  mapReservaDocToListRow,
  buildReservaListFilter,
} from './lib/reservas-list-shared.js'

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(204, {}, event, 'GET, OPTIONS')
  }

  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' }, event, 'GET, OPTIONS')
  }

  try {
    const usersCol = await getAdminUsersCollection()
    const auth = await requireAuthAsync(event, ['reservas:read'], usersCol)
    if (!auth.ok) return jsonResponse(auth.statusCode, { error: auth.error }, event, 'GET, OPTIONS')

    const q = event.queryStringParameters || {}

    let fechaDesde = q.fechaDesde
    if (fechaDesde === undefined || fechaDesde === null || fechaDesde === '') {
      fechaDesde = defaultFechaDesdeMesAnterior()
    } else if (!FECHA_YMD_QUERY_RE.test(String(fechaDesde))) {
      return jsonResponse(400, { error: 'fechaDesde debe ser YYYY-MM-DD' }, event, 'GET, OPTIONS')
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

    return jsonResponse(200, {
      reservas: list,
      hasMore,
      fechaDesde,
      skip,
      limit,
    }, event, 'GET, OPTIONS')
  } catch (err) {
    console.error('[ReservasList]', err.message)
    return jsonResponse(500, { error: apiErrorMessage(err) }, event, 'GET, OPTIONS')
  }
}
