/** Parse formato de horas tipo "P5:12:00 PM,1:00 PM|P7:12:00 PM" */
export function parseHorasFromString(horas) {
  if (!horas) return []
  const result = []
  String(horas).split('|').forEach(block => {
    const m = block.match(/^P(\d+):(.+)$/)
    if (m) {
      const pista = parseInt(m[1], 10)
      m[2].split(',').forEach(h => result.push({ pista, hora: h.trim() }))
    }
  })
  return result
}
