import { listAuditEventsByDomain } from '../repositories/audit.repository.js'

function toPublic(row) {
  const metadata = row.metadata ?? {}
  return {
    id: row.id,
    domain: row.domain,
    occurredAt: row.created_at,
    event: row.action,
    resource: row.subject_label || row.subject_id || '',
    resourceId: row.subject_id,
    performedByUserId: row.actor_user_id,
    performedByLabel: metadata.performedByLabel ?? '',
    request: metadata.request ?? null,
    response: metadata.response ?? null,
    metadata,
  }
}

export async function listHistoryByDomain(domain, query = {}) {
  const rows = await listAuditEventsByDomain(domain, {
    limit: query.limit,
    offset: query.offset,
  })
  return { events: rows.map(toPublic) }
}
