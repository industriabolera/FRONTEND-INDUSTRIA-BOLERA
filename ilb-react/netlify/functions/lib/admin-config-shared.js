import { getAdminConfigCollection } from './db.js'

export const DEFAULT_HORARIOS = {
  lunMie: { apertura: '2:00 PM', cierre: '10:00 PM' },
  jueVie: { apertura: '2:00 PM', cierre: '11:00 PM' },
  sab: { apertura: '12:00 PM', cierre: '11:00 PM' },
  domFest: { apertura: '12:00 PM', cierre: '9:00 PM' },
}

export const DEFAULT_ADMIN_CONFIG = {
  precios: {
    pistaLJ: 120000,
    pistaVD: 132000,
    zapatos: 7500,
    jugadorAdicional: 31000,
  },
  horarios: {
    lunMie: { ...DEFAULT_HORARIOS.lunMie },
    jueVie: { ...DEFAULT_HORARIOS.jueVie },
    sab: { ...DEFAULT_HORARIOS.sab },
    domFest: { ...DEFAULT_HORARIOS.domFest },
  },
  promociones: [],
}

const HORARIOS_KEYS = ['lunMie', 'jueVie', 'sab', 'domFest']

// Normaliza horarios al esquema nuevo de cuatro grupos (lunMie/jueVie/sab/domFest).
// Conserva los grupos explicitos presentes; para los ausentes aplica los nuevos
// defaults. Descarta el esquema antiguo `jueSab` sin mapearlo a jueves-viernes.
export function normalizeHorarios(horarios) {
  const source = horarios && typeof horarios === 'object' ? horarios : {}
  const out = {}
  for (const key of HORARIOS_KEYS) {
    out[key] =
      source[key] && typeof source[key] === 'object'
        ? { ...source[key] }
        : { ...DEFAULT_HORARIOS[key] }
  }
  return out
}

// Normaliza la config completa conservando el resto de campos (precios,
// promociones, etc.) y garantizando los cuatro grupos de horarios.
export function normalizeAdminConfig(config) {
  const base = config && typeof config === 'object' ? { ...config } : {}
  return { ...base, horarios: normalizeHorarios(base.horarios) }
}

function horariosEqual(a, b) {
  if (!a || !b) return false
  return HORARIOS_KEYS.every(
    (k) => a[k]?.apertura === b[k]?.apertura && a[k]?.cierre === b[k]?.cierre
  )
}

export async function getOrInitAdminConfig() {
  const col = await getAdminConfigCollection()
  const existing = await col.findOne({ key: 'main' })
  if (existing?.value) {
    const normalized = normalizeAdminConfig(existing.value)
    if (!horariosEqual(existing.value.horarios, normalized.horarios)) {
      await col.updateOne(
        { key: 'main' },
        { $set: { value: normalized, updatedAt: new Date() } }
      )
    }
    return normalized
  }
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
