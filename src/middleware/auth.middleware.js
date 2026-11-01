import { getProfile, verifyAccessToken } from '../services/auth.service.js'

export async function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  try {
    const token = header.slice(7)
    const payload = verifyAccessToken(token)
    req.auth = {
      userId: payload.sub,
      role: payload.role,
      email: payload.email,
    }
    req.user = await getProfile(payload.sub)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}
