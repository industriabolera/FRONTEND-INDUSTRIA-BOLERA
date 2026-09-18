import test from 'node:test'
import assert from 'node:assert/strict'
import { buildContactEmailContent } from './contactEmail.js'

const base = {
  nombre: 'Ana', apellido: 'Pérez', email: 'ana@example.com', asunto: 'Consulta', mensaje: 'Mensaje',
}

test('incluye el teléfono en texto y HTML', () => {
  const result = buildContactEmailContent({ ...base, telefono: '+573001234567' })
  assert.match(result.text, /Teléfono: \+573001234567/)
  assert.match(result.html, /<strong>Teléfono:<\/strong> \+573001234567/)
})

test('muestra No proporcionado y escapa el contenido HTML', () => {
  const empty = buildContactEmailContent({ ...base, telefono: null })
  assert.match(empty.text, /Teléfono: No proporcionado/)
  assert.match(empty.html, /Teléfono:<\/strong> No proporcionado/)

  const escaped = buildContactEmailContent({ ...base, telefono: '<script>' })
  assert.doesNotMatch(escaped.html, /<script>/)
  assert.match(escaped.html, /&lt;script&gt;/)
})
