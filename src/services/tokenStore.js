const revoked = new Map()

export function revokeJti(jti, expSeconds) {
  if (!jti) return
  const until = (expSeconds ?? Math.floor(Date.now() / 1000) + 60) * 1000
  revoked.set(jti, until)
}

export function isJtiRevoked(jti) {
  if (!jti) return false
  const until = revoked.get(jti)
  if (!until) return false
  if (Date.now() > until) {
    revoked.delete(jti)
    return false
  }
  return true
}

const codes = new Map()

export function issueImpersonationCode({ userId, adminId, ttlMs = 60_000 }) {
  const code = crypto.randomUUID().replaceAll('-', '')
  codes.set(code, { userId, adminId, exp: Date.now() + ttlMs })
  return code
}

export function consumeImpersonationCode(code) {
  const row = codes.get(code)
  codes.delete(code)
  if (!row || Date.now() > row.exp) return null
  return row
}
