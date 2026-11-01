import { MongoClient } from 'mongodb'
import { env } from '../config/env.js'

/** @type {MongoClient | null} */
let client = null
/** @type {import('mongodb').Db | null} */
let db = null

export async function connectMongo() {
  if (db) return db

  client = new MongoClient(env.mongo.uri)
  await client.connect()
  db = client.db()
  await db.command({ ping: 1 })
  return db
}

export function getMongoDb() {
  if (!db) {
    throw new Error('MongoDB not connected. Call connectMongo() during startup.')
  }
  return db
}

export async function mongoHealth() {
  try {
    const database = getMongoDb()
    const ping = await database.command({ ping: 1 })
    return { ok: ping.ok === 1, database: database.databaseName }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

export async function closeMongo() {
  if (client) {
    await client.close()
    client = null
    db = null
  }
}
