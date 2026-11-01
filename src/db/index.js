import { closeMongo, connectMongo, mongoHealth } from './mongo.js'
import { closePostgres, connectPostgres, postgresHealth } from './postgres.js'

export async function connectDatabases() {
  await Promise.all([connectPostgres(), connectMongo()])
}

export async function databasesHealth() {
  const [postgres, mongo] = await Promise.all([postgresHealth(), mongoHealth()])
  return { postgres, mongo }
}

export async function closeDatabases() {
  await Promise.all([closePostgres(), closeMongo()])
}
