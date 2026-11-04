import { syncTimeTrigger, enqueueNow, jobsEnabled } from '../jobs/runner.js'
import {
  deleteJobTrigger,
  findJobTrigger,
  insertJobTrigger,
  listEnabledByEvent,
  listJobTriggers,
  updateJobTrigger,
} from '../repositories/jobTriggers.repository.js'

const TRIGGERS = new Set(['time', 'event', 'dependency'])
const RECURRENCES = new Set(['once', 'hourly', 'daily', 'weekly'])
const STATUSES = new Set(['never', 'success', 'failed'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function httpError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

export function toPublicJobTrigger(row) {
  return {
    id: row.id,
    name: row.name,
    trigger: row.trigger_type,
    recurrence: row.recurrence,
    startAt: row.start_at,
    eventName: row.event_name,
    dependsOn: row.depends_on ?? '',
    target: row.target,
    payload: JSON.stringify(row.payload ?? {}, null, 2),
    enabled: row.enabled,
    lastStatus: row.last_status,
    lastRunAt: row.last_run_at,
    nextRunAt: row.trigger_type === 'time' ? row.start_at : null,
  }
}

function parsePayload(value) {
  if (value == null || value === '') return {}
  if (typeof value === 'object' && !Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(String(value))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw httpError(400, 'Payload must be a JSON object')
    }
    return parsed
  } catch (err) {
    if (err.status) throw err
    throw httpError(400, 'Payload must be valid JSON')
  }
}

async function normalize(body, current) {
  const name = (body?.name === undefined ? (current?.name ?? '') : String(body.name)).trim()
  const trigger = body?.trigger === undefined ? (current?.trigger_type ?? '') : String(body.trigger)
  const recurrence = body?.recurrence === undefined ? (current?.recurrence ?? 'daily') : String(body.recurrence)
  const eventName = (body?.eventName === undefined ? (current?.event_name ?? '') : String(body.eventName)).trim()
  const target = (body?.target === undefined ? (current?.target ?? '') : String(body.target)).trim()
  const enabled = body?.enabled === undefined ? (current?.enabled ?? true) : Boolean(body.enabled)
  const lastStatus = body?.lastStatus === undefined ? (current?.last_status ?? 'never') : String(body.lastStatus)
  let dependsOn = body?.dependsOn === undefined ? (current?.depends_on ?? null) : body.dependsOn || null
  let startAt = body?.startAt === undefined ? (current?.start_at ?? null) : body.startAt || null
  const payload = body?.payload === undefined ? (current?.payload ?? {}) : parsePayload(body.payload)

  if (!name || name.length > 120) throw httpError(400, 'Name is required')
  if (!TRIGGERS.has(trigger)) throw httpError(400, 'Trigger must be time, event, or dependency')
  if (!RECURRENCES.has(recurrence)) throw httpError(400, 'Recurrence is not supported')
  if (!target || target.length > 200) throw httpError(400, 'Target is required')
  if (eventName.length > 120) throw httpError(400, 'Event name is too long')
  if (!STATUSES.has(lastStatus)) throw httpError(400, 'Run status is not supported')
  if (trigger === 'event' && !eventName) throw httpError(400, 'Event name is required')
  if (trigger === 'dependency') {
    if (!dependsOn || !UUID_RE.test(String(dependsOn))) throw httpError(400, 'Choose a job to depend on')
    if (current && dependsOn === current.id) throw httpError(400, 'A job cannot depend on itself')
    const parent = await findJobTrigger(dependsOn)
    if (!parent) throw httpError(400, 'The job this trigger depends on does not exist')
  } else {
    dependsOn = null
  }
  if (startAt) {
    const parsed = new Date(startAt)
    if (Number.isNaN(parsed.getTime())) throw httpError(400, 'Start time is not a valid date')
    startAt = parsed.toISOString()
  } else if (trigger === 'time') {
    throw httpError(400, 'Start time is required for a time trigger')
  } else {
    startAt = null
  }

  let lastRunAt = current?.last_run_at ?? null
  if (body?.lastStatus != null && lastStatus !== 'never') lastRunAt = new Date().toISOString()
  if (body?.lastStatus != null && lastStatus === 'never') lastRunAt = null

  return {
    name,
    trigger,
    recurrence: trigger === 'time' ? recurrence : 'once',
    startAt,
    eventName: trigger === 'event' ? eventName : '',
    dependsOn: trigger === 'dependency' ? dependsOn : null,
    target,
    payload,
    enabled,
    lastStatus,
    lastRunAt,
  }
}

async function publish(row) {
  try {
    await syncTimeTrigger(row)
  } catch (err) {
    console.error('[jobs] could not sync trigger', row?.id, err.message)
  }
  return toPublicJobTrigger(row)
}

export async function listJobTriggerCatalog() {
  const rows = await listJobTriggers()
  return { triggers: rows.map(toPublicJobTrigger), runner: jobsEnabled() ? 'bullmq' : 'off' }
}

export async function createJobTrigger(body) {
  const row = await insertJobTrigger(await normalize(body, null))
  return publish(row)
}

export async function patchJobTrigger(id, body) {
  if (!UUID_RE.test(String(id))) throw httpError(400, 'Unknown job trigger')
  const current = await findJobTrigger(id)
  if (!current) throw httpError(404, 'Job trigger not found')
  const row = await updateJobTrigger(id, await normalize(body, current))
  return publish(row)
}

export async function removeJobTrigger(id) {
  if (!UUID_RE.test(String(id))) throw httpError(400, 'Unknown job trigger')
  const current = await findJobTrigger(id)
  if (!current) throw httpError(404, 'Job trigger not found')
  await deleteJobTrigger(id)
  await syncTimeTrigger({ ...current, enabled: false })
}

export async function runJobTrigger(id) {
  if (!UUID_RE.test(String(id))) throw httpError(400, 'Unknown job trigger')
  const current = await findJobTrigger(id)
  if (!current) throw httpError(404, 'Job trigger not found')
  await enqueueNow(id, 'manual')
  return toPublicJobTrigger(await findJobTrigger(id))
}

export async function fireJobEvent(eventName) {
  const name = String(eventName ?? '').trim()
  if (!name) throw httpError(400, 'Event name is required')
  const rows = await listEnabledByEvent(name)
  for (const row of rows) await enqueueNow(row.id, 'event')
  return { eventName: name, ran: rows.length }
}
