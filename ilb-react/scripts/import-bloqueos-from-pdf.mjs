/**
 * Lee un PDF exportado del panel Admin > Pistas (captura de lista de bloqueos),
 * extrae pista, fechas y horas, y hace upsert en MongoDB colección `bloqueos`.
 *
 * Uso:
 *   node scripts/import-bloqueos-from-pdf.mjs [ruta/al/archivo.pdf]
 *   node scripts/import-bloqueos-from-pdf.mjs --dry-run [ruta.pdf]
 *
 * Requiere MONGODB_URI en ilb-react/.env (salvo --dry-run).
 */
import { createHash } from 'crypto'
import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { MongoClient } from 'mongodb'

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
dotenv.config({ path: join(root, '.env') })

const MOTIVO = 'Importado desde PDF (captura panel admin)'

function stableId({ pista, fechaInicio, fechaFin, horas }) {
  const key = `${pista}|${fechaInicio}|${fechaFin}|${[...horas].sort().join(',')}`
  return `pdf-${createHash('sha256').update(key).digest('hex').slice(0, 32)}`
}

function parseBloqueosFromText(text) {
  const normalized = text.replace(/(\d{4}-\d{2}-\d{2})(\d{1,2}:\d{2}\s*(?:AM|PM))/g, '$1 $2')
  const re = /Pista\s+(\d+)\s+(\d+)\s+hora\(s\)[\s\S]*?(\d{4}-\d{2}-\d{2})(?:\s*→\s*(\d{4}-\d{2}-\d{2}))?[\s\S]*?((?:\d{1,2}:\d{2}\s*(?:AM|PM))(?:\s*,\s*\d{1,2}:\d{2}\s*(?:AM|PM))*)/gi
  const out = []
  let m
  while ((m = re.exec(normalized)) !== null) {
    const pista = Number(m[1])
    const fechaInicio = m[3]
    const fechaFin = m[4] || m[3]
    const horas = m[5].split(',').map(s => s.trim()).filter(Boolean)
    if (!Number.isInteger(pista) || pista < 1) continue
    out.push({ pista, fechaInicio, fechaFin, horas })
  }
  return out
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const paths = args.filter(a => a !== '--dry-run')
  const pdfPath = paths[0] || join(process.env.HOME || '', 'Downloads', 'La Industria Bolera | Inicio | Fabricamos Diversión.pdf')

  const buf = readFileSync(pdfPath)
  const { text } = await pdfParse(buf)
  const parsed = parseBloqueosFromText(text)
  console.log(`Archivo: ${pdfPath}`)
  console.log(`Bloqueos detectados: ${parsed.length}`)

  if (dryRun) {
    console.log(JSON.stringify(parsed.slice(0, 3), null, 2))
    console.log('… (dry-run, no se escribe en MongoDB)')
    return
  }

  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('Falta MONGODB_URI en ilb-react/.env')
    process.exit(1)
  }

  const client = new MongoClient(uri)
  await client.connect()
  const col = client.db('administracion').collection('bloqueos')
  await col.createIndex({ id: 1 }, { unique: true })

  let upserted = 0
  for (const row of parsed) {
    const id = stableId(row)
    const doc = {
      id,
      pista: row.pista,
      fechaInicio: row.fechaInicio,
      fechaFin: row.fechaFin,
      horas: row.horas,
      motivo: MOTIVO,
      creadaEn: new Date(),
    }
    await col.replaceOne({ id }, doc, { upsert: true })
    upserted++
  }

  await client.close()
  console.log(`Upsert en MongoDB (colección bloqueos): ${upserted}`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
