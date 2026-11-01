import { Router } from 'express'
import { healthRouter } from './health.routes.js'
import { authRouter } from './auth.routes.js'
import { authenticate, requireRole } from '../middleware/auth.middleware.js'

export const apiRouter = Router()

apiRouter.use(healthRouter)
apiRouter.use('/auth', authRouter)

apiRouter.get('/orders', authenticate, (_req, res) => {
  res.json({ data: [], message: 'Orders API stub — implement in routes/orders.routes.js' })
})

apiRouter.get('/admin/summary', authenticate, requireRole('admin'), (_req, res) => {
  res.json({ area: 'admin', message: 'Admin-only API surface' })
})

apiRouter.get('/client/summary', authenticate, requireRole('client'), (_req, res) => {
  res.json({ area: 'client', message: 'Client portal API surface' })
})
