import test from 'node:test'
import assert from 'node:assert/strict'
import { validateContact } from './contactValidator.js'

const validPayload = {
  nombre: 'Ana',
  email: 'ana@example.com',
  asunto: 'Consulta',
  mensaje: 'Mensaje suficientemente largo.',
  terminosAceptados: true,
}

test('acepta teléfono vacío y lo normaliza a null', () => {
  const result = validateContact({ ...validPayload, telefono: '' })
  assert.equal(result.valid, true)
  assert.equal(result.data.telefono, null)
})

test('acepta y normaliza teléfono válido', () => {
  const result = validateContact({ ...validPayload, telefono: '300 123 4567' })
  assert.equal(result.valid, true)
  assert.equal(result.data.telefono, '+573001234567')
})

test('rechaza teléfono no vacío inválido', () => {
  const result = validateContact({ ...validPayload, telefono: 'abc' })
  assert.equal(result.valid, false)
  assert.ok(result.errors.telefono)
})
