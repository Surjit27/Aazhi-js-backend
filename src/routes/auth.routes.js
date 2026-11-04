import { Router } from 'express'
import { authenticate, requireAdminPortal, requireRole, requireRoleMatchesPortal } from '../middleware/auth.middleware.js'
import { rateLimit } from '../middleware/rateLimit.js'
import {
  exchangeImpersonationCode,
  listAccounts,
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
    res.json(result)
  } catch (err) {
    next(err)
  }
})

authRouter.post('/logout', authenticate, (req, res) => {
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
    res.json(result)
  } catch (err) {
    next(err)
  }
})

authRouter.get('/users', authenticate, requireRoleMatchesPortal, requireRole('admin'), requireAdminPortal, async (req, res, next) => {
  try {
    const role = req.query.role === 'client' || req.query.role === 'admin' ? req.query.role : undefined
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
    const userRole = role === 'admin' ? 'admin' : 'client'
    const user = await registerUser({ email, password, displayName, role: userRole }, req.auth.role)
    res.status(201).json({ user })
  } catch (err) {
    next(err)
  }
})
