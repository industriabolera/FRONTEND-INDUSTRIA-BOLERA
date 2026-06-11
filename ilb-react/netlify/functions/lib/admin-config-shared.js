import { getAdminConfigCollection } from './db.js'

export const DEFAULT_ADMIN_CONFIG = {
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

export async function getOrInitAdminConfig() {
  const col = await getAdminConfigCollection()
  const existing = await col.findOne({ key: 'main' })
  if (existing?.value) return existing.value
  await col.updateOne(
    { key: 'main' },
    {
      $set: { key: 'main', value: DEFAULT_ADMIN_CONFIG, updatedAt: new Date() },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  )
  return DEFAULT_ADMIN_CONFIG
}
