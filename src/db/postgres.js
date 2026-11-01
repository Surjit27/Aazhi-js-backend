import pg from 'pg'
import { env } from '../config/env.js'

const { Pool } = pg

/** @type {pg.Pool | null} */
let pool = null

export function getPostgresPool() {
  if (pool) return pool

  pool = env.postgres.connectionString
    ? new Pool({ connectionString: env.postgres.connectionString })
    : new Pool({
        host: env.postgres.host,
        port: env.postgres.port,
        user: env.postgres.user,
        password: env.postgres.password,
        database: env.postgres.database,
        max: 10,
        idleTimeoutMillis: 30_000,
      })

  pool.on('error', (err) => {
    console.error('[postgres] unexpected pool error', err)
  })

  return pool
}

export async function connectPostgres() {
  const p = getPostgresPool()
  const client = await p.connect()
  try {
    await client.query('SELECT 1')
  } finally {
    client.release()
  }
  return p
}

export async function postgresHealth() {
  try {
    const p = getPostgresPool()
    const { rows } = await p.query('SELECT NOW() AS now, current_database() AS database')
    return { ok: true, database: rows[0]?.database, serverTime: rows[0]?.now }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

export async function closePostgres() {
  if (!pool) return
  await pool.end()
  pool = null
}
