import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.middleware.js'
import { listAccounts, login, registerUser } from '../services/auth.service.js'

export const authRouter = Router()

authRouter.post('/login', async (req, res, next) => {
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

authRouter.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user })
})

authRouter.get('/users', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const role = req.query.role === 'client' || req.query.role === 'admin' ? req.query.role : undefined
    const users = await listAccounts(req.auth.role, { role })
    res.json({ users })
  } catch (err) {
    next(err)
  }
})

authRouter.post('/users', authenticate, requireRole('admin'), async (req, res, next) => {
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
