/**
 * Elimina reservas cuya fecha de juego (campo `fecha`, YYYY-MM-DD) es anterior a HOY
 * en hora de Colombia. Las de hoy no se borran.
 *
 * Uso (desde ilb-react): node scripts/delete-reservas-before-today.mjs
 * Requiere MONGODB_URI en .env
 */
import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
dotenv.config({ path: join(root, '.env') })

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('Falta MONGODB_URI en ilb-react/.env')
  process.exit(1)
}

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
console.log('Fecha de corte (hoy, America/Bogota):', today)

const client = new MongoClient(uri)
await client.connect()
const col = client.db('administracion').collection('reservas')

const filter = {
  fecha: { $exists: true, $type: 'string', $regex: /^\d{4}-\d{2}-\d{2}$/, $lt: today },
}

const toDelete = await col.countDocuments(filter)
console.log('Reservas a eliminar (fecha < hoy):', toDelete)

if (toDelete === 0) {
  console.log('No hay registros que cumplan el criterio.')
  await client.close()
  process.exit(0)
}

const result = await col.deleteMany(filter)
console.log('Eliminadas:', result.deletedCount)
await client.close()
