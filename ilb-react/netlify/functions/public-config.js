import { getAdminConfigCollection } from './lib/db.js'

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
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' })
  try {
    const value = await getOrInitConfig()
    return json(200, { config: value })
  } catch (err) {
    console.error('[PublicConfig]', err.message)
    return json(500, { error: err.message })
  }
}

