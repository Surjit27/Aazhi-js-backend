import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import { isCorsOriginAllowed } from './config/cors.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { apiRouter } from './routes/index.js'

export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  )
  app.use(
    cors({
      origin(origin, callback) {
        if (isCorsOriginAllowed(origin, env.corsOrigins, env.isProd)) {
          callback(null, origin || true)
          return
        }
        if (!env.isProd) {
          console.warn('[cors] blocked origin:', origin, 'allowed:', env.corsOrigins)
        }
        callback(null, false)
      },
      credentials: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-App-Surface', 'Accept'],
    }),
  )
  app.use(express.json({ limit: '1mb' }))
  app.use(morgan(env.isProd ? 'combined' : 'dev'))

  app.use('/api', apiRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
