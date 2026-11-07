import { Router } from 'express'
import { authenticate, requireAdminPortal, requireRole, requireRoleMatchesPortal } from '../middleware/auth.middleware.js'
import { AUDIT_ACTION, AUDIT_DOMAIN, recordAuditEvent } from '../audit/index.js'
import { getEmailSettings, sendTestEmail, updateEmailSettings } from '../services/emailSettings.service.js'

export const emailSettingsRouter = Router()

const adminOnly = [authenticate, requireRoleMatchesPortal, requireRole('admin'), requireAdminPortal]

emailSettingsRouter.get('/email', ...adminOnly, async (_req, res, next) => {
  try {
    res.json({ email: await getEmailSettings() })
  } catch (err) {
    next(err)
  }
})

emailSettingsRouter.put('/email', ...adminOnly, async (req, res, next) => {
  try {
    const email = await updateEmailSettings(req.body ?? {})
    recordAuditEvent({
      domain: AUDIT_DOMAIN.EMAIL,
      action: AUDIT_ACTION.EMAIL_SETTINGS_UPDATED,
      actorUserId: req.auth.userId,
      subjectLabel: email.fromEmail || 'email settings',
      metadata: { enabled: email.enabled, fromEmail: email.fromEmail },
    })
    res.json({ email })
  } catch (err) {
    next(err)
  }
})

emailSettingsRouter.post('/email/test', ...adminOnly, async (req, res, next) => {
  try {
    const result = await sendTestEmail(req.body?.to)
    recordAuditEvent({
      domain: AUDIT_DOMAIN.EMAIL,
      action: AUDIT_ACTION.EMAIL_TEST_SENT,
      actorUserId: req.auth.userId,
      subjectLabel: result.to,
    })
    res.json(result)
  } catch (err) {
    recordAuditEvent({
      domain: AUDIT_DOMAIN.EMAIL,
      action: AUDIT_ACTION.EMAIL_TEST_FAILED,
      actorUserId: req.auth?.userId,
      subjectLabel: String(req.body?.to ?? ''),
      metadata: { error: err.message },
    })
    next(err)
  }
})
