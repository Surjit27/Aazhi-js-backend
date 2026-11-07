import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPostgresPool } from '../postgres.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), 'migrations')

export function clientSchemaName(userId) {
  const safe = String(userId).replace(/[^a-f0-9]/gi, '')
  return `client_${safe}`
}

function listMigrationFiles() {
  return readdirSync(ROOT)
    .filter((name) => /^\d+_.+\.sql$/i.test(name))
    .sort()
}

export async function provisionClientSchema(clientUserId) {
  const pool = getPostgresPool()
  const schema = clientSchemaName(clientUserId)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`)
    await client.query(`SET search_path TO ${schema}, public`)

    let latest = '0000'
    for (const file of listMigrationFiles()) {
      const version = file.split('_')[0]
      const sql = readFileSync(join(ROOT, file), 'utf8')
      await client.query(sql)
      latest = version
    }

    await client.query('SET search_path TO public')
    await client.query(
      `INSERT INTO client_schema_registry (client_user_id, schema_name, migration_version)
       VALUES ($1, $2, $3)
       ON CONFLICT (client_user_id) DO UPDATE SET
         migration_version = EXCLUDED.migration_version,
         provisioned_at = NOW()`,
      [clientUserId, schema, latest],
    )
    await client.query('COMMIT')
    return { schemaName: schema, migrationVersion: latest }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/** Apply any new client-schema SQL files not yet recorded for this client. */
export async function migrateClientSchemaIfNeeded(clientUserId) {
  const pool = getPostgresPool()
  const { rows } = await pool.query(`SELECT schema_name, migration_version FROM client_schema_registry WHERE client_user_id = $1`, [
    clientUserId,
  ])
  if (rows.length === 0) return provisionClientSchema(clientUserId)

  const schema = rows[0].schema_name
  const current = rows[0].migration_version
  const files = listMigrationFiles().filter((f) => f.split('_')[0] > current)
  if (files.length === 0) return { schemaName: schema, migrationVersion: current, applied: 0 }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`SET search_path TO ${schema}, public`)
    let latest = current
    for (const file of files) {
      const sql = readFileSync(join(ROOT, file), 'utf8')
      await client.query(sql)
      latest = file.split('_')[0]
    }
    await client.query('SET search_path TO public')
    await client.query(`UPDATE client_schema_registry SET migration_version = $1, provisioned_at = NOW() WHERE client_user_id = $2`, [
      latest,
      clientUserId,
    ])
    await client.query('COMMIT')
    return { schemaName: schema, migrationVersion: latest, applied: files.length }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
