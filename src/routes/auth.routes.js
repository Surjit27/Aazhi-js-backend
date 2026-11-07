import { Router } from 'express'
import { authenticate, requireAdminPortal, requireRole, requireRoleMatchesPortal } from '../middleware/auth.middleware.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { AUDIT_ACTION, AUDIT_DOMAIN, recordAuditEvent } from '../audit/index.js'
import {
  exchangeImpersonationCode,
  createRoleCatalog,
  listAccounts,
  listRoleCatalog,
  login,
  registerUser,
  revokeAccessToken,
  startClientImpersonation,
} from '../services/auth.service.js'

export const authRouter = Router()

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 12, name: 'login' })
const exchangeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, name: 'impersonate-exchange' })

authRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const email = req.body?.email
    const password = req.body?.password
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' })
    }
    const surface =
      String(req.headers['x-app-surface'] ?? req.headers['X-App-Surface'] ?? 'client').toLowerCase() === 'admin'
        ? 'admin'
        : 'client'
    const result = await login(email, password, surface)
    recordAuditEvent({
      domain: AUDIT_DOMAIN.USER,
      action: AUDIT_ACTION.LOGIN_SUCCESS,
      actorUserId: result.user.id,
      subjectId: result.user.id,
      subjectLabel: result.user.email,
      metadata: { portal: surface },
    })
    res.json(result)
  } catch (err) {
    recordAuditEvent({
      domain: AUDIT_DOMAIN.USER,
      action: AUDIT_ACTION.LOGIN_FAILED,
      subjectLabel: String(req.body?.email ?? '').trim().toLowerCase(),
      metadata: { portal: String(req.headers['x-app-surface'] ?? 'client').toLowerCase() },
    })
    next(err)
  }
})

authRouter.post('/logout', authenticate, (req, res) => {
  recordAuditEvent({
    domain: AUDIT_DOMAIN.USER,
    action: AUDIT_ACTION.LOGOUT,
    actorUserId: req.auth.userId,
    subjectId: req.auth.userId,
    subjectLabel: req.auth.email ?? '',
  })
  revokeAccessToken(req.auth)
  res.json({ ok: true })
})

authRouter.get('/me', authenticate, requireRoleMatchesPortal, (req, res) => {
  res.json({
    user: {
      ...req.user,
      impersonatedBy: req.auth.impersonatedBy,
      impersonation: Boolean(req.auth.impersonatedBy),
    },
  })
})

authRouter.post(
  '/impersonate',
  authenticate,
  requireRoleMatchesPortal,
  requireRole('admin'),
  requireAdminPortal,
  async (req, res, next) => {
    try {
      const userId = req.body?.userId
      if (!userId) return res.status(400).json({ error: 'userId is required' })
      const result = await startClientImpersonation(req.auth.userId, userId)
      recordAuditEvent({
        domain: AUDIT_DOMAIN.USER,
        action: AUDIT_ACTION.IMPERSONATION_STARTED,
        actorUserId: req.auth.userId,
        subjectId: userId,
        metadata: { expiresInSeconds: result.expiresInSeconds },
      })
      res.json(result)
    } catch (err) {
      next(err)
    }
  },
)

authRouter.post('/impersonate/exchange', exchangeLimiter, async (req, res, next) => {
  try {
    const code = req.body?.code
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'code is required' })
    }
    const result = await exchangeImpersonationCode(code)
    recordAuditEvent({
      domain: AUDIT_DOMAIN.USER,
      action: AUDIT_ACTION.IMPERSONATION_OPENED,
      actorUserId: result.user.impersonatedBy,
      subjectId: result.user.id,
      subjectLabel: result.user.email,
    })
    res.json(result)
  } catch (err) {
    next(err)
  }
})

authRouter.get('/roles', authenticate, requireRoleMatchesPortal, requireRole('admin'), requireAdminPortal, async (req, res, next) => {
  try {
    const roles = await listRoleCatalog(req.auth.role)
    res.json({ roles })
  } catch (err) {
    next(err)
  }
})

authRouter.post('/roles', authenticate, requireRoleMatchesPortal, requireRole('admin'), requireAdminPortal, async (req, res, next) => {
  try {
    const { key, label, portal } = req.body ?? {}
    const role = await createRoleCatalog({ key, label, portal }, req.auth.role)
    recordAuditEvent({
      domain: AUDIT_DOMAIN.USER,
      action: AUDIT_ACTION.ROLE_CREATED,
      actorUserId: req.auth.userId,
      subjectId: role.id,
      subjectLabel: role.key,
      metadata: { portal: role.portal, label: role.label },
    })
    res.status(201).json({ role })
  } catch (err) {
    next(err)
  }
})

authRouter.get('/users', authenticate, requireRoleMatchesPortal, requireRole('admin'), requireAdminPortal, async (req, res, next) => {
  try {
    const requested = typeof req.query.role === 'string' ? req.query.role : ''
    const role = /^[a-z][a-z0-9_]{1,39}$/.test(requested) ? requested : undefined
    const users = await listAccounts(req.auth.role, { role })
    res.json({ users })
  } catch (err) {
    next(err)
  }
})

authRouter.post('/users', authenticate, requireRoleMatchesPortal, requireRole('admin'), requireAdminPortal, async (req, res, next) => {
  try {
    const { email, password, displayName, role = 'client' } = req.body ?? {}
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' })
    }
    const user = await registerUser({ email, password, displayName, role: String(role) }, req.auth.role)
    recordAuditEvent({
      domain: AUDIT_DOMAIN.USER,
      action: AUDIT_ACTION.USER_CREATED,
      actorUserId: req.auth.userId,
      subjectId: user.id,
      subjectLabel: user.email,
      metadata: { role: user.role },
    })
    res.status(201).json({ user })
  } catch (err) {
    next(err)
  }
})
