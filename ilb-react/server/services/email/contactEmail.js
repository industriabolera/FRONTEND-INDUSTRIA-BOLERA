function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return entities[character]
  })
}

export function buildContactEmailContent(data) {
  const fullName = [data.nombre, data.apellido].filter(Boolean).join(' ')
  const telefono = data.telefono || 'No proporcionado'
  const subject = `Nuevo mensaje de contacto: ${data.asunto.replace(/[\r\n]+/g, ' ')}`
  const text = [
    `Nombre: ${fullName}`,
    `Email: ${data.email}`,
    `Teléfono: ${telefono}`,
    `Asunto: ${data.asunto}`,
    '',
    data.mensaje,
    '',
    'Términos aceptados: Sí',
  ].join('\n')
  const html = `
    <h2>Nuevo mensaje de contacto</h2>
    <p><strong>Nombre:</strong> ${escapeHtml(fullName)}</p>
    <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
    <p><strong>Teléfono:</strong> ${escapeHtml(telefono)}</p>
    <p><strong>Asunto:</strong> ${escapeHtml(data.asunto)}</p>
    <p><strong>Mensaje:</strong></p>
    <p>${escapeHtml(data.mensaje).replace(/\n/g, '<br>')}</p>
    <p><strong>Términos aceptados:</strong> Sí</p>
  `

  return { subject, text, html }
}
