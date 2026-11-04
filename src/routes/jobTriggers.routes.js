import { Router } from 'express'
import { authenticate, requireRoleMatchesPortal } from '../middleware/auth.middleware.js'
import {
  createJobTrigger,
  fireJobEvent,
  listJobTriggerCatalog,
  patchJobTrigger,
  removeJobTrigger,
  runJobTrigger,
} from '../services/jobTriggers.service.js'

export const jobTriggersRouter = Router()

const signedIn = [authenticate, requireRoleMatchesPortal]

jobTriggersRouter.get('/job-triggers', ...signedIn, async (_req, res, next) => {
  try {
    res.json(await listJobTriggerCatalog())
  } catch (err) {
    next(err)
  }
})

jobTriggersRouter.post('/job-triggers', ...signedIn, async (req, res, next) => {
  try {
    res.status(201).json({ trigger: await createJobTrigger(req.body ?? {}) })
  } catch (err) {
    next(err)
  }
})

jobTriggersRouter.post('/job-triggers/events', ...signedIn, async (req, res, next) => {
  try {
    res.json(await fireJobEvent(req.body?.eventName))
  } catch (err) {
    next(err)
  }
})

jobTriggersRouter.post('/job-triggers/:id/run', ...signedIn, async (req, res, next) => {
  try {
    res.json({ trigger: await runJobTrigger(req.params.id) })
  } catch (err) {
    next(err)
  }
})

jobTriggersRouter.patch('/job-triggers/:id', ...signedIn, async (req, res, next) => {
  try {
    res.json({ trigger: await patchJobTrigger(req.params.id, req.body ?? {}) })
  } catch (err) {
    next(err)
  }
})

jobTriggersRouter.delete('/job-triggers/:id', ...signedIn, async (req, res, next) => {
  try {
    await removeJobTrigger(req.params.id)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})
