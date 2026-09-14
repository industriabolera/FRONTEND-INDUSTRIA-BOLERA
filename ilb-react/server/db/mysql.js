/* global process */

import mysql from 'mysql2/promise'

const configuredPort = Number.parseInt(process.env.MYSQL_PORT || '3306', 10)
const mysqlPort = Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : 3306

const poolConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: mysqlPort,
  user: process.env.MYSQL_USER || undefined,
  password: process.env.MYSQL_PASSWORD || undefined,
  database: process.env.MYSQL_DATABASE || undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ...(process.env.MYSQL_SOCKET_PATH ? { socketPath: process.env.MYSQL_SOCKET_PATH } : {}),
}

export const pool = mysql.createPool(poolConfig)

const CONTACT_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS contact_messages (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NULL,
    email VARCHAR(255) NOT NULL,
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

let contactTableReady = false
let tableInitializationPromise = null

function logDatabaseError(operation, error) {
  console.error(`[MySQL] ${operation}: ${error?.message || 'Error desconocido'}`)
}

export async function initContactTable() {
  if (contactTableReady) return true
  if (tableInitializationPromise) return tableInitializationPromise

  tableInitializationPromise = (async () => {
    try {
      await pool.query(CONTACT_TABLE_SQL)
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
        (nombre, apellido, email, asunto, mensaje, terminos_aceptados, terminos_version, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(data.nombre || '').trim(),
        data.apellido ? String(data.apellido).trim() : null,
        String(data.email || '').trim(),
        String(data.asunto || '').trim(),
        String(data.mensaje || '').trim(),
        data.terminosAceptados === true,
        String(data.terminosVersion || '2026-v1').trim() || '2026-v1',
        data.ipAddress ? String(data.ipAddress).trim() : null,
      ]
    )

    return result.insertId ? Number(result.insertId) : null
  } catch (error) {
    logDatabaseError('No se pudo guardar el mensaje de contacto', error)
    return null
  }
}

export async function updateEmailStatus(id, { status, emailId = null, error = null } = {}) {
  const validStatuses = new Set(['pending', 'sent', 'failed'])
  if (!validStatuses.has(status)) {
    console.error(`[MySQL] Estado de email inválido: ${String(status)}`)
    return false
  }

  try {
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
