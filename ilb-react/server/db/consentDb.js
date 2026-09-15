import { contactDbConfig, pool } from './mysql.js'

const CONSENT_ACTION_TYPES = new Set(['accept_all', 'reject_optional', 'custom'])
const DEFAULT_POLICY_VERSION = '2026-v1'

const CONSENT_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS cookie_consents (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    consent_uuid VARCHAR(64) NOT NULL,
    necessary BOOLEAN NOT NULL DEFAULT TRUE,
    analytics BOOLEAN NOT NULL DEFAULT FALSE,
    action_type ENUM('accept_all', 'reject_optional', 'custom') NOT NULL DEFAULT 'accept_all',
    policy_version VARCHAR(50) NOT NULL DEFAULT '2026-v1',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_consent_uuid (consent_uuid),
    INDEX idx_created_at (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`

let consentTableReady = false
let tableInitializationPromise = null

function sanitizeErrorMessage(error) {
  return String(error?.message || error || 'Error desconocido')
    .replace(/[\r\n]+/g, ' ')
    .replace(/(password|passwd|pwd|secret|token|api[-_ ]?key)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/(\/\/[^/\s:]+:)[^@\s]+@/g, '$1[redacted]@')
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[redacted]')
    .slice(0, 240)
}

function logDatabaseError(operation, error) {
  console.error(`[MySQL] ${operation}: ${sanitizeErrorMessage(error)}`)
}

export async function initConsentTable() {
  if (consentTableReady) return true
  if (tableInitializationPromise) return tableInitializationPromise

  tableInitializationPromise = (async () => {
    try {
      if (!contactDbConfig.ok || !pool) {
        logDatabaseError('Consentimiento SQL no disponible', contactDbConfig.error)
        return false
      }
      await pool.query(CONSENT_TABLE_SQL)
      consentTableReady = true
      return true
    } catch (error) {
      logDatabaseError('No se pudo inicializar cookie_consents', error)
      return false
    } finally {
      tableInitializationPromise = null
    }
  })()

  return tableInitializationPromise
}

export async function insertCookieConsent(data = {}) {
  try {
    const tableReady = await initConsentTable()
    if (!tableReady) return null

    const actionType = CONSENT_ACTION_TYPES.has(data.actionType) ? data.actionType : 'accept_all'
    const policyVersion = String(data.policyVersion || '').trim().slice(0, 50) || DEFAULT_POLICY_VERSION
    const consentUuid = String(data.consentUuid || '').trim().slice(0, 64)

    const [result] = await pool.execute(
      `INSERT INTO cookie_consents
        (consent_uuid, necessary, analytics, action_type, policy_version)
       VALUES (?, ?, ?, ?, ?)`,
      [
        consentUuid,
        data.necessary === true,
        data.analytics === true,
        actionType,
        policyVersion,
      ]
    )

    return result.insertId ? Number(result.insertId) : null
  } catch (error) {
    logDatabaseError('No se pudo guardar el consentimiento de cookies', error)
    return null
  }
}
