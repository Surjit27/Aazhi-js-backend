import { listAuditEventsByDomain } from '../repositories/audit.repository.js'

function toPublic(row) {
  return {
    id: row.id,
    domain: row.domain,
    action: row.action,
    actorUserId: row.actor_user_id,
    subjectId: row.subject_id,
    subjectLabel: row.subject_label,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  }
}

export async function listHistoryByDomain(domain, query = {}) {
  const rows = await listAuditEventsByDomain(domain, {
    limit: query.limit,
    offset: query.offset,
  })
  return { events: rows.map(toPublic) }
}
