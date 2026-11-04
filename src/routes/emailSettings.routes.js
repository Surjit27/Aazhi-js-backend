import { Router } from 'express'
import { authenticate, requireAdminPortal, requireRole, requireRoleMatchesPortal } from '../middleware/auth.middleware.js'
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
    res.json({ email: await updateEmailSettings(req.body ?? {}) })
  } catch (err) {
    next(err)
  }
})

emailSettingsRouter.post('/email/test', ...adminOnly, async (req, res, next) => {
  try {
    res.json(await sendTestEmail(req.body?.to))
  } catch (err) {
    next(err)
  }
})
