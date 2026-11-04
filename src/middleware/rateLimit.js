const buckets = new Map()

export function rateLimit({ windowMs, max, name }) {
  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown'
    const key = `${name}:${ip}`
    const now = Date.now()
    const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
    if (recent.length >= max) {
      return res.status(429).json({ error: 'Too many requests. Try again shortly.' })
    }
    recent.push(now)
    buckets.set(key, recent)
    next()
  }
}
