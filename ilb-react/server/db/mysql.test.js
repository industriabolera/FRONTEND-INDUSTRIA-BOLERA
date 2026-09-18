import test from 'node:test'
import assert from 'node:assert/strict'
import { buildContactMessageInsertValues, ensureContactPhoneColumn } from './mysql.js'

test('mapea teléfono normalizado o null para persistencia', () => {
  const base = {
    nombre: 'Ana', email: 'ana@example.com', asunto: 'Consulta', mensaje: 'Mensaje',
    terminosAceptados: true,
  }
  assert.equal(buildContactMessageInsertValues({ ...base, telefono: '+573001234567' })[3], '+573001234567')
  assert.equal(buildContactMessageInsertValues(base)[3], null)
})

const compatibleColumn = {
  COLUMN_NAME: 'telefono',
  DATA_TYPE: 'varchar',
  CHARACTER_MAXIMUM_LENGTH: 16,
  IS_NULLABLE: 'YES',
}

test('crea y verifica la columna nullable cuando falta', async () => {
  const calls = []
  const db = {
    async query(sql) {
      calls.push(sql)
      if (/ALTER TABLE/.test(sql)) return [{ affectedRows: 0 }]
      return [calls.some(call => /ALTER TABLE/.test(call)) ? [compatibleColumn] : []]
    },
  }

  assert.equal(await ensureContactPhoneColumn(db), true)
  assert.equal(calls.filter(sql => /ALTER TABLE/.test(sql)).length, 1)
})

test('no altera una columna ya compatible', async () => {
  const calls = []
  const db = {
    async query(sql) {
      calls.push(sql)
      return [[compatibleColumn]]
    },
  }

  assert.equal(await ensureContactPhoneColumn(db), true)
  assert.equal(calls.some(sql => /ALTER TABLE/.test(sql)), false)
})

test('rechaza un esquema existente incompatible', async () => {
  const db = {
    async query() {
      return [[{ ...compatibleColumn, IS_NULLABLE: 'NO' }]]
    },
  }

  await assert.rejects(
    ensureContactPhoneColumn(db),
    /no es VARCHAR\(16\) NULL compatible/
  )
})
