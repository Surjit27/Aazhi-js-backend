import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { createUser, findUserByEmail, findUserById, listUsers, toPublicUser } from '../repositories/users.repository.js'

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    env.auth.jwtSecret,
    { expiresIn: env.auth.jwtExpiresIn },
  )
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.auth.jwtSecret)
}

export async function login(email, password, appSurface) {
  const normalizedEmail = String(email).trim().toLowerCase()
  const normalizedPassword = String(password)
  const user = await findUserByEmail(normalizedEmail)
  if (!user) {
    const err = new Error('Invalid email or password')
    err.status = 401
    throw err
  }
  const ok = await bcrypt.compare(normalizedPassword, user.password_hash)
  if (!ok) {
    const err = new Error('Invalid email or password')
    err.status = 401
    throw err
  }
  const publicUser = toPublicUser(user)
  if (appSurface === 'admin' && publicUser.role !== 'admin') {
    const err = new Error('Client accounts must sign in at localhost, not admin.localhost')
    err.status = 403
    throw err
  }
  if (appSurface === 'client' && publicUser.role !== 'client') {
    const err = new Error('Admin accounts must sign in at admin.localhost')
    err.status = 403
    throw err
  }
  const token = signAccessToken(publicUser)
  return { token, user: publicUser }
}

export async function getProfile(userId) {
  const user = await findUserById(userId)
  if (!user) {
    const err = new Error('User not found')
    err.status = 404
    throw err
  }
  return toPublicUser(user)
}

export async function registerUser({ email, password, displayName, role }, actorRole) {
  if (actorRole !== 'admin') {
    const err = new Error('Only admins can create accounts')
    err.status = 403
    throw err
  }
  if (role !== 'admin' && role !== 'client') {
    const err = new Error('role must be admin or client')
    err.status = 400
    throw err
  }
  const existing = await findUserByEmail(email)
  if (existing) {
    const err = new Error('Email already registered')
    err.status = 409
    throw err
  }
  const passwordHash = await bcrypt.hash(password, 12)
  const user = await createUser({
    email,
    passwordHash,
    role,
    displayName: displayName || email.split('@')[0],
  })
  return toPublicUser(user)
}

/** @deprecated use registerUser */
export async function registerClient(payload, actorRole) {
  return registerUser({ ...payload, role: 'client' }, actorRole)
}

export async function listAccounts(actorRole, { role } = {}) {
  if (actorRole !== 'admin') {
    const err = new Error('Forbidden')
    err.status = 403
    throw err
  }
  const rows = await listUsers({ role })
  return rows.map(toPublicUser)
}
