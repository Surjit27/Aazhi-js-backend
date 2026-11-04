import { Queue, QueueEvents, Worker } from 'bullmq'
import IORedis from 'ioredis'
import {
  findJobTrigger,
  listEnabledDependents,
  listJobTriggers,
  markJobTriggerRun,
} from '../repositories/jobTriggers.repository.js'

const QUEUE_NAME = 'aazhi-jobs'

let queue
let worker
let events
const openConnections = []

function connection(url) {
  const client = new IORedis(url, { maxRetriesPerRequest: null })
  openConnections.push(client)
  return client
}

export function jobsEnabled() {
  return Boolean(queue)
}

function cronFor(recurrence, start) {
  const minute = start.getUTCMinutes()
  const hour = start.getUTCHours()
  const day = start.getUTCDay()
  if (recurrence === 'hourly') return `${minute} * * * *`
  if (recurrence === 'weekly') return `${minute} ${hour} * * ${day}`
  return `${minute} ${hour} * * *`
}

async function removeScheduled(id) {
  const repeatable = await queue.getRepeatableJobs()
  for (const job of repeatable) {
    if (job.key === id || String(job.key).endsWith(`:${id}`)) {
      await queue.removeRepeatableByKey(job.key)
    }
  }
  const once = await queue.getJob(`once-${id}`)
  if (once) await once.remove()
}

export async function syncTimeTrigger(row) {
  if (!queue || !row) return
  await removeScheduled(row.id)
  if (!row.enabled || row.trigger_type !== 'time' || !row.start_at) return
  const start = new Date(row.start_at)
  if (Number.isNaN(start.getTime())) return
  if (row.recurrence === 'once') {
    const delay = Math.max(0, start.getTime() - Date.now())
    await queue.add('run', { triggerId: row.id, reason: 'once' }, { delay, jobId: `once-${row.id}` })
    return
  }
  await queue.add(
    'run',
    { triggerId: row.id, reason: 'time' },
    { repeat: { pattern: cronFor(row.recurrence, start), key: row.id } },
  )
}

async function processJob(job) {
  const row = await findJobTrigger(job.data.triggerId)
  if (!row?.enabled) return { skipped: true }
  try {
    await markJobTriggerRun(row.id, 'success')
    const dependents = await listEnabledDependents(row.id)
    for (const dependent of dependents) {
      await queue.add('run', { triggerId: dependent.id, reason: 'dependency' }, { removeOnComplete: 100 })
    }
    console.log(`[jobs] ran ${row.name} → ${row.target}`)
    return { id: row.id, target: row.target }
  } catch (err) {
    await markJobTriggerRun(row.id, 'failed')
    throw err
  }
}

export async function enqueueNow(triggerId, reason) {
  if (!queue || !events) {
    const err = new Error('Redis is not running. Start it with docker compose up -d redis')
    err.status = 503
    throw err
  }
  const job = await queue.add('run', { triggerId, reason }, { removeOnComplete: 100, removeOnFail: 50 })
  return job.waitUntilFinished(events, 15_000)
}

export async function startJobRunner(redisUrl) {
  if (!redisUrl || queue) return jobsEnabled()
  const probe = new IORedis(redisUrl, {
    lazyConnect: true,
    connectTimeout: 2000,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  })
  try {
    await probe.connect()
    await probe.ping()
  } catch (err) {
    console.warn('[jobs] Redis unavailable — job runner not started:', err.message)
    probe.disconnect()
    return false
  }
  probe.disconnect()
  queue = new Queue(QUEUE_NAME, { connection: connection(redisUrl) })
  worker = new Worker(QUEUE_NAME, processJob, { connection: connection(redisUrl) })
  events = new QueueEvents(QUEUE_NAME, { connection: connection(redisUrl) })
  worker.on('failed', (job, err) => {
    console.error('[jobs] failed', job?.id, err.message)
  })
  const rows = await listJobTriggers()
  for (const row of rows) await syncTimeTrigger(row)
  console.log(`[jobs] BullMQ listening on ${redisUrl}`)
  return true
}

export async function stopJobRunner() {
  await Promise.race([
    Promise.all([worker?.close(), events?.close(), queue?.close()]),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ])
  for (const client of openConnections) client.disconnect()
  openConnections.length = 0
  queue = undefined
  worker = undefined
  events = undefined
}
