import { getOrInitAdminConfig } from './lib/admin-config-shared.js'

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export async function handler(event) {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' })
  try {
    const value = await getOrInitAdminConfig()
    return json(200, { config: value })
  } catch (err) {
    console.error('[PublicConfig]', err.message)
    return json(500, { error: err.message })
  }
}

