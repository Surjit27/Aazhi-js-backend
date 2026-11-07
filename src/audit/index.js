/** PaperTrail-like append-only audit log for the Aazhi stack (no Ruby dependency). */
export { AUDIT_DOMAIN, AUDIT_ACTION } from './constants.js'
export { auditHttpRequest, auditHttpResponse } from './snapshot.js'
export { recordAuditEvent } from './record.js'
