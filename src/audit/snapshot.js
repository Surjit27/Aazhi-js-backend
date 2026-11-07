const REDACT_KEYS = new Set(['password', 'code', 'apikey', 'apiKey', 'token', 'passwordHash'])

function sanitize(value) {
  if (value == null) return value
  if (Array.isArray(value)) return value.map(sanitize)
  if (typeof value !== 'object') return value
  const out = {}
  for (const [key, val] of Object.entries(value)) {
    if (REDACT_KEYS.has(key) || key.toLowerCase().includes('cipher')) {
      out[key] = '[redacted]'
    } else {
      out[key] = sanitize(val)
    }
  }
  return out
}

export function auditHttpRequest(method, path, body) {
  return { method, path, body: sanitize(body ?? {}) }
}

export function auditHttpResponse(body) {
  return { body: sanitize(body ?? {}) }
}
