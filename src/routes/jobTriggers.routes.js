import { Router } from 'express'
import { authenticate, requireRoleMatchesPortal } from '../middleware/auth.middleware.js'
import { AUDIT_ACTION, AUDIT_DOMAIN, recordAuditEvent } from '../audit/index.js'
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
    const trigger = await createJobTrigger(req.body ?? {})
    recordAuditEvent({
      domain: AUDIT_DOMAIN.JOB,
      action: AUDIT_ACTION.JOB_TRIGGER_CREATED,
      actorUserId: req.auth.userId,
      subjectId: trigger.id,
      subjectLabel: trigger.name,
    })
    res.status(201).json({ trigger })
  } catch (err) {
    next(err)
  }
})

jobTriggersRouter.post('/job-triggers/events', ...signedIn, async (req, res, next) => {
  try {
    const fired = await fireJobEvent(req.body?.eventName)
    recordAuditEvent({
      domain: AUDIT_DOMAIN.JOB,
      action: AUDIT_ACTION.JOB_EVENT_FIRED,
      actorUserId: req.auth.userId,
      subjectLabel: fired.eventName,
      metadata: { ran: fired.ran },
    })
    res.json(fired)
  } catch (err) {
    next(err)
  }
})

jobTriggersRouter.post('/job-triggers/:id/run', ...signedIn, async (req, res, next) => {
  try {
    const trigger = await runJobTrigger(req.params.id)
    recordAuditEvent({
      domain: AUDIT_DOMAIN.JOB,
      action: AUDIT_ACTION.JOB_TRIGGER_RUN_MANUAL,
      actorUserId: req.auth.userId,
      subjectId: trigger.id,
      subjectLabel: trigger.name,
    })
    res.json({ trigger })
  } catch (err) {
    next(err)
  }
})

jobTriggersRouter.patch('/job-triggers/:id', ...signedIn, async (req, res, next) => {
  try {
    const trigger = await patchJobTrigger(req.params.id, req.body ?? {})
    recordAuditEvent({
      domain: AUDIT_DOMAIN.JOB,
      action: AUDIT_ACTION.JOB_TRIGGER_UPDATED,
      actorUserId: req.auth.userId,
      subjectId: trigger.id,
      subjectLabel: trigger.name,
    })
    res.json({ trigger })
  } catch (err) {
    next(err)
  }
})

jobTriggersRouter.delete('/job-triggers/:id', ...signedIn, async (req, res, next) => {
  try {
    const id = req.params.id
    await removeJobTrigger(id)
    recordAuditEvent({
      domain: AUDIT_DOMAIN.JOB,
      action: AUDIT_ACTION.JOB_TRIGGER_DELETED,
      actorUserId: req.auth.userId,
      subjectId: id,
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})
