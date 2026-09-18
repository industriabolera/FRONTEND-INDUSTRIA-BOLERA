import test from 'node:test'
import assert from 'node:assert/strict'
import { buildContactPayload, normalizeContactPhone, validateContactPhone } from './contactForm.js'

test('normaliza teléfonos colombianos e internacionales', () => {
  assert.equal(normalizeContactPhone('300 123 4567'), '+573001234567')
  assert.equal(normalizeContactPhone('00 34 612 345 678'), '+34612345678')
  assert.equal(validateContactPhone('+57 300 123 4567'), '')
  assert.equal(validateContactPhone('+1 (202) 555-0123'), '')
})

test('el teléfono es opcional pero rechaza valores no vacíos inválidos', () => {
  assert.equal(validateContactPhone(''), '')
  assert.match(validateContactPhone('teléfono falso'), /teléfono válido/i)
  assert.match(validateContactPhone('1234'), /indicativo/i)
})

test('el payload incluye el teléfono normalizado o vacío', () => {
  const base = {
    nombre: ' Ana ', apellido: '', email: ' ana@example.com ', telefono: '300-123-4567',
    asunto: ' Consulta ', mensaje: ' Mensaje de prueba ', terminosAceptados: true, _honey: '',
  }
  assert.equal(buildContactPayload(base).telefono, '+573001234567')
  assert.equal(buildContactPayload({ ...base, telefono: ' ' }).telefono, '')
})
