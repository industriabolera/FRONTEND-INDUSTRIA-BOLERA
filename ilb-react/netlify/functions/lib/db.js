import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = 'administracion'

let cachedClient = null
let indexesEnsured = false
let bloqueosIndexesEnsured = false
let adminUsersIndexesEnsured = false
let adminConfigIndexesEnsured = false

export async function getDb() {
  if (cachedClient) {
    return cachedClient.db(DB_NAME)
  }

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set')
  }

  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 1,
    maxIdleTimeMS: 60000,
    serverSelectionTimeoutMS: 5000,
  })

  await client.connect()
  cachedClient = client
  console.log('[MongoDB] Connected to administracion')
  return client.db(DB_NAME)
}

export async function getReservasCollection() {
  const db = await getDb()
  const collection = db.collection('reservas')

  if (!indexesEnsured) {
    await Promise.all([
      collection.createIndex({ reference: 1 }, { unique: true }),
      collection.createIndex({ requestId: 1 }),
      collection.createIndex({ estado: 1 }),
      collection.createIndex({ fecha: 1 }),
      collection.createIndex({ 'datosPersonales.documento': 1 }),
    ])
    indexesEnsured = true
  }

  return collection
}

export async function getBloqueosCollection() {
  const db = await getDb()
  const collection = db.collection('bloqueos')

  if (!bloqueosIndexesEnsured) {
    await collection.createIndex({ id: 1 }, { unique: true })
    bloqueosIndexesEnsured = true
  }

  return collection
}

export async function getAdminUsersCollection() {
  const db = await getDb()
  const collection = db.collection('admin_users')

  if (!adminUsersIndexesEnsured) {
    await Promise.all([
      collection.createIndex({ username: 1 }, { unique: true }),
      collection.createIndex({ role: 1 }),
    ])
    adminUsersIndexesEnsured = true
  }

  return collection
}

export async function getAdminConfigCollection() {
  const db = await getDb()
  const collection = db.collection('admin_config')

  if (!adminConfigIndexesEnsured) {
    await collection.createIndex({ key: 1 }, { unique: true })
    adminConfigIndexesEnsured = true
  }

  return collection
}
