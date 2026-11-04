import { getPostgresPool } from '../db/postgres.js'

const COLUMNS = `id, name, trigger_type, recurrence, start_at, event_name, depends_on, target, payload,
  enabled, last_status, last_run_at, created_at, updated_at`

export async function listJobTriggers() {
  const { rows } = await getPostgresPool().query(`SELECT ${COLUMNS} FROM job_triggers ORDER BY created_at DESC`)
  return rows
}

export async function findJobTrigger(id) {
  const { rows } = await getPostgresPool().query(`SELECT ${COLUMNS} FROM job_triggers WHERE id = $1`, [id])
  return rows[0] ?? null
}

export async function listEnabledDependents(id) {
  const { rows } = await getPostgresPool().query(
    `SELECT ${COLUMNS} FROM job_triggers WHERE depends_on = $1 AND enabled = TRUE`,
    [id],
  )
  return rows
}

export async function listEnabledByEvent(eventName) {
  const { rows } = await getPostgresPool().query(
    `SELECT ${COLUMNS} FROM job_triggers WHERE trigger_type = 'event' AND event_name = $1 AND enabled = TRUE`,
    [eventName],
  )
  return rows
}

export async function insertJobTrigger(fields) {
  const { rows } = await getPostgresPool().query(
    `INSERT INTO job_triggers
      (name, trigger_type, recurrence, start_at, event_name, depends_on, target, payload, enabled)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
     RETURNING ${COLUMNS}`,
    [
      fields.name,
      fields.trigger,
      fields.recurrence,
      fields.startAt,
      fields.eventName,
      fields.dependsOn,
      fields.target,
      JSON.stringify(fields.payload),
      fields.enabled,
    ],
  )
  return rows[0]
}

export async function updateJobTrigger(id, fields) {
  const { rows } = await getPostgresPool().query(
    `UPDATE job_triggers
     SET name = $2,
         trigger_type = $3,
         recurrence = $4,
         start_at = $5,
         event_name = $6,
         depends_on = $7,
         target = $8,
         payload = $9::jsonb,
         enabled = $10,
         last_status = $11,
         last_run_at = $12,
         updated_at = NOW()
     WHERE id = $1
     RETURNING ${COLUMNS}`,
    [
      id,
      fields.name,
      fields.trigger,
      fields.recurrence,
      fields.startAt,
      fields.eventName,
      fields.dependsOn,
      fields.target,
      JSON.stringify(fields.payload),
      fields.enabled,
      fields.lastStatus,
      fields.lastRunAt,
    ],
  )
  return rows[0] ?? null
}

export async function markJobTriggerRun(id, status) {
  await getPostgresPool().query(
    `UPDATE job_triggers
     SET last_status = $2, last_run_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [id, status],
  )
}

export async function deleteJobTrigger(id) {
  const pool = getPostgresPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const dependents = await client.query(`SELECT id FROM job_triggers WHERE depends_on = $1`, [id])
    await client.query(`DELETE FROM job_triggers WHERE id = $1`, [id])
    if (dependents.rows.length) {
      await client.query(
        `UPDATE job_triggers SET enabled = FALSE, depends_on = NULL, updated_at = NOW() WHERE id = ANY($1::uuid[])`,
        [dependents.rows.map((row) => row.id)],
      )
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
