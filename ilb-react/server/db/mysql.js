/* global process */

import { isIP } from 'node:net'
import mysql from 'mysql2/promise'

const CONTACT_DB_TARGETS = new Set(['local', 'hostinger'])
const LOCAL_DB_DEFAULT_PORT = 3307
const HOSTINGER_DB_DEFAULT_PORT = 3306

function normalizedEnvValue(env, key) {
  return typeof env[key] === 'string' ? env[key].trim() : ''
}

function isLoopbackHost(host) {
  const normalizedHost = String(host || '').trim().toLowerCase().replace(/^\[|\]$/g, '')
  if (normalizedHost === 'localhost') return true

  const ipVersion = isIP(normalizedHost)
  if (ipVersion === 4) return normalizedHost.startsWith('127.')
  if (ipVersion === 6) return normalizedHost === '::1' || normalizedHost === '0:0:0:0:0:0:0:1'
  return false
}

function parsePort(value) {
  const port = Number(value)
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : null
}

export function resolveContactDbConfig(env = process.env) {
  const target = normalizedEnvValue(env, 'CONTACT_DB_TARGET').toLowerCase()
  if (!CONTACT_DB_TARGETS.has(target)) {
    return {
      ok: false,
      error: 'CONTACT_DB_TARGET debe ser local o hostinger; no existe fallback automático.',
    }
  }

  const host = normalizedEnvValue(env, 'MYSQL_HOST')
  const socketPath = normalizedEnvValue(env, 'MYSQL_SOCKET_PATH')
  const user = normalizedEnvValue(env, 'MYSQL_USER')
  const password = typeof env.MYSQL_PASSWORD === 'string' ? env.MYSQL_PASSWORD : ''
  const database = normalizedEnvValue(env, 'MYSQL_DATABASE')
  const configuredPort = env.MYSQL_PORT || (target === 'local' ? LOCAL_DB_DEFAULT_PORT : HOSTINGER_DB_DEFAULT_PORT)
  const port = parsePort(configuredPort)

  if (target === 'local') {
    if (!isLoopbackHost(host)) {
      return { ok: false, error: 'CONTACT_DB_TARGET=local requiere MYSQL_HOST loopback.' }
    }
    if (socketPath) {
      return { ok: false, error: 'CONTACT_DB_TARGET=local requiere conexión TCP; no uses MYSQL_SOCKET_PATH.' }
    }
  } else if (!host && !socketPath) {
    return { ok: false, error: 'CONTACT_DB_TARGET=hostinger requiere MYSQL_HOST o MYSQL_SOCKET_PATH.' }
  }

  if (port === null) return { ok: false, error: 'MYSQL_PORT debe ser un puerto TCP válido.' }
  if (!user || !password || !database) {
    return { ok: false, error: 'MYSQL_USER, MYSQL_PASSWORD y MYSQL_DATABASE son obligatorios.' }
  }

  return {
    ok: true,
    target,
    poolConfig: {
      host: host || 'localhost',
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 5000,
      ...(socketPath ? { socketPath } : {}),
    },
  }
}

export const contactDbConfig = resolveContactDbConfig()

let configuredPool = null
let poolCreationError = null
if (contactDbConfig.ok) {
  try {
    configuredPool = mysql.createPool(contactDbConfig.poolConfig)
  } catch (error) {
    poolCreationError = error
  }
}

export const pool = configuredPool

const CONTACT_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS contact_messages (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NULL,
    email VARCHAR(255) NOT NULL,
    telefono VARCHAR(16) NULL,
    asunto VARCHAR(150) NOT NULL,
    mensaje TEXT NOT NULL,
    terminos_aceptados BOOLEAN NOT NULL DEFAULT FALSE,
    terminos_version VARCHAR(50) NOT NULL DEFAULT '2026-v1',
    ip_address VARCHAR(45) NULL,
    email_status ENUM('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
    email_id VARCHAR(100) NULL,
    email_error TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`

const CONTACT_PHONE_COLUMN_QUERY = `
  SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'contact_messages'
    AND COLUMN_NAME = 'telefono'
`

const ADD_CONTACT_PHONE_COLUMN_SQL = `
  ALTER TABLE contact_messages
  ADD COLUMN telefono VARCHAR(16) NULL AFTER email
`

let contactTableReady = false
let tableInitializationPromise = null

function sanitizeErrorMessage(error) {
  return String(error?.message || error || 'Error desconocido')
    .replace(/[\r\n]+/g, ' ')
    .replace(/(password|passwd|pwd|secret|token|api[-_ ]?key)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/(\/\/[^/\s:]+:)[^@\s]+@/g, '$1[redacted]@')
    .slice(0, 240)
}

function logDatabaseError(operation, error) {
  console.error(`[MySQL] ${operation}: ${sanitizeErrorMessage(error)}`)
}

function isCompatiblePhoneColumn(column) {
  return String(column?.COLUMN_NAME || '').toLowerCase() === 'telefono'
    && String(column?.DATA_TYPE || '').toLowerCase() === 'varchar'
    && Number(column?.CHARACTER_MAXIMUM_LENGTH) >= 16
    && String(column?.IS_NULLABLE || '').toUpperCase() === 'YES'
}

export async function ensureContactPhoneColumn(db = pool) {
  if (!db) throw new Error('Pool SQL de contacto no disponible.')

  let [columns] = await db.query(CONTACT_PHONE_COLUMN_QUERY)
  if (columns.length === 0) {
    try {
      await db.query(ADD_CONTACT_PHONE_COLUMN_SQL)
    } catch (error) {
      // Dos instancias pueden intentar el bootstrap al mismo tiempo. Si otra ya
      // creó la columna, la verificación posterior decide si el esquema sirve.
      if (error?.code !== 'ER_DUP_FIELDNAME') throw error
    }
    const [verifiedColumns] = await db.query(CONTACT_PHONE_COLUMN_QUERY)
    columns = verifiedColumns
  }

  if (columns.length !== 1 || !isCompatiblePhoneColumn(columns[0])) {
    throw new Error('La columna contact_messages.telefono no es VARCHAR(16) NULL compatible.')
  }

  return true
}

export async function initContactTable() {
  if (contactTableReady) return true
  if (tableInitializationPromise) return tableInitializationPromise

  tableInitializationPromise = (async () => {
    try {
      if (!contactDbConfig.ok || !pool) {
        logDatabaseError('Contacto SQL no disponible', poolCreationError || contactDbConfig.error)
        return false
      }
      await pool.query(CONTACT_TABLE_SQL)
      await ensureContactPhoneColumn(pool)
      contactTableReady = true
      return true
    } catch (error) {
      logDatabaseError('No se pudo inicializar contact_messages', error)
      return false
    } finally {
      tableInitializationPromise = null
    }
  })()

  return tableInitializationPromise
}

export async function insertContactMessage(data = {}) {
  try {
    const tableReady = await initContactTable()
    if (!tableReady) return null

    const [result] = await pool.execute(
      `INSERT INTO contact_messages
        (nombre, apellido, email, telefono, asunto, mensaje, terminos_aceptados, terminos_version, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      buildContactMessageInsertValues(data)
    )

    return result.insertId ? Number(result.insertId) : null
  } catch (error) {
    logDatabaseError('No se pudo guardar el mensaje de contacto', error)
    return null
  }
}

export function buildContactMessageInsertValues(data = {}) {
  const telefono = data.telefono ? String(data.telefono).trim() : ''
  return [
    String(data.nombre || '').trim(),
    data.apellido ? String(data.apellido).trim() : null,
    String(data.email || '').trim(),
    telefono || null,
    String(data.asunto || '').trim(),
    String(data.mensaje || '').trim(),
    data.terminosAceptados === true,
    String(data.terminosVersion || '2026-v1').trim() || '2026-v1',
    data.ipAddress ? String(data.ipAddress).trim() : null,
  ]
}

export async function updateEmailStatus(id, { status, emailId = null, error = null } = {}) {
  const validStatuses = new Set(['pending', 'sent', 'failed'])
  if (!validStatuses.has(status)) {
    console.error(`[MySQL] Estado de email inválido: ${String(status)}`)
    return false
  }

  try {
    if (!contactDbConfig.ok || !pool) {
      logDatabaseError('No se pudo actualizar el estado del email', poolCreationError || contactDbConfig.error)
      return false
    }

    const [result] = await pool.execute(
      `UPDATE contact_messages
       SET email_status = ?, email_id = ?, email_error = ?
       WHERE id = ?`,
      [
        status,
        emailId ? String(emailId).slice(0, 100) : null,
        error ? String(error) : null,
        id,
      ]
    )

    return result.affectedRows > 0
  } catch (dbError) {
    logDatabaseError('No se pudo actualizar el estado del email', dbError)
    return false
  }
}
