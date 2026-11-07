import { insertAuditEvent } from '../repositories/audit.repository.js'

/**
 * Fire-and-forget audit write. Call sites must never await this in the request critical path.
 * @param {import('../repositories/audit.repository.js').AuditInsert} event
 */
export function recordAuditEvent(event) {
  insertAuditEvent(event).catch((err) => {
    console.error('[audit] could not persist event', event?.action, err.message)
  })
}
