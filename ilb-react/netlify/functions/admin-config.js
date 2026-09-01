import { getAdminConfigCollection } from './lib/db.js'
import { requireAuth } from './lib/admin-auth.js'
import { getOrInitAdminConfig, normalizeAdminConfig } from './lib/admin-config-shared.js'

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { 'Content-Type': 'application/json' } }

  const auth = requireAuth(event, ['config:read'])
  if (!auth.ok) return json(auth.statusCode, { error: auth.error })

  try {
    const col = await getAdminConfigCollection()

    if (event.httpMethod === 'GET') {
      const value = await getOrInitAdminConfig()
      return json(200, { config: value })
    }

    if (event.httpMethod === 'POST') {
      const authWrite = requireAuth(event, ['config:write'])
      if (!authWrite.ok) return json(authWrite.statusCode, { error: authWrite.error })

      const body = JSON.parse(event.body || '{}')
      const current = await getOrInitAdminConfig()

      const next = normalizeAdminConfig({
        ...current,
        ...(body.precios ? { precios: { ...current.precios, ...body.precios } } : {}),
        ...(body.horarios ? { horarios: { ...current.horarios, ...body.horarios } } : {}),
        ...(body.promociones ? { promociones: Array.isArray(body.promociones) ? body.promociones : current.promociones } : {}),
      })

      await col.updateOne(
        { key: 'main' },
        { $set: { value: next, updatedAt: new Date() } },
        { upsert: true }
      )

      return json(200, { config: next })
    }

    return json(405, { error: 'Method not allowed' })
  } catch (err) {
    console.error('[AdminConfig]', err.message)
    return json(500, { error: err.message })
  }
}

