import { getAdminConfigCollection } from './lib/db.js'
import { requireAuth } from './lib/admin-auth.js'

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

const DEFAULT_CONFIG = {
  precios: {
    pistaLJ: 120000,
    pistaVD: 132000,
    zapatos: 7500,
    jugadorAdicional: 31000,
  },
  horarios: {
    lunMie: { apertura: '12:00 PM', cierre: '10:00 PM' },
    jueSab: { apertura: '12:00 PM', cierre: '11:00 PM' },
    domFest: { apertura: '12:00 PM', cierre: '9:00 PM' },
  },
  promociones: [],
}

async function getOrInitConfig() {
  const col = await getAdminConfigCollection()
  const existing = await col.findOne({ key: 'main' })
  if (existing?.value) return existing.value
  await col.updateOne(
    { key: 'main' },
    { $set: { key: 'main', value: DEFAULT_CONFIG, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  )
  return DEFAULT_CONFIG
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { 'Content-Type': 'application/json' } }

  const auth = requireAuth(event, ['config:read'])
  if (!auth.ok) return json(auth.statusCode, { error: auth.error })

  try {
    const col = await getAdminConfigCollection()

    if (event.httpMethod === 'GET') {
      const value = await getOrInitConfig()
      return json(200, { config: value })
    }

    if (event.httpMethod === 'POST') {
      const authWrite = requireAuth(event, ['config:write'])
      if (!authWrite.ok) return json(authWrite.statusCode, { error: authWrite.error })

      const body = JSON.parse(event.body || '{}')
      const current = await getOrInitConfig()

      const next = {
        ...current,
        ...(body.precios ? { precios: { ...current.precios, ...body.precios } } : {}),
        ...(body.horarios ? { horarios: { ...current.horarios, ...body.horarios } } : {}),
        ...(body.promociones ? { promociones: Array.isArray(body.promociones) ? body.promociones : current.promociones } : {}),
      }

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

