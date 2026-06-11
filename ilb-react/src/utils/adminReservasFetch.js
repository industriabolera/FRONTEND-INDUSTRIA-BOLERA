/**
 * El API GET /api/reservas aplica por defecto: fecha desde el día 1 del mes calendario anterior
 * hasta el futuro (no trae datos más viejos). Devuelve páginas; aquí las unimos todas.
 * Requiere token admin con permiso reservas:read.
 */

export const ADMIN_RESERVAS_PAGE_SIZE = 250

/**
 * @param {string} [token] Bearer JWT del panel admin
 * @returns {Promise<object[]>}
 */
export async function fetchAllReservasForAdminPortal(token) {
  if (!token) throw new Error('Sesión admin requerida para cargar reservas')

  const headers = { Authorization: `Bearer ${token}` }
  const merged = []
  let skip = 0
  let safety = 0
  const maxPages = 500

  while (safety < maxPages) {
    safety += 1
    const qs = new URLSearchParams({
      skip: String(skip),
      limit: String(ADMIN_RESERVAS_PAGE_SIZE),
    })
    const res = await fetch(`/api/reservas?${qs}`, { headers })
    const data = await res.json().catch(() => ({}))
    if (!res.ok)
      throw new Error(data.error || `Error al cargar reservas (${res.status})`)

    const batch = Array.isArray(data.reservas) ? data.reservas : []
    merged.push(...batch)

    if (!data.hasMore || batch.length === 0)
      break

    skip += ADMIN_RESERVAS_PAGE_SIZE
  }

  return merged
}
