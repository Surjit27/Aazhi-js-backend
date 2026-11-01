import { getPostgresPool } from '../db/postgres.js'

export async function findUserByEmail(email) {
  const { rows } = await getPostgresPool().query(
    `SELECT id, email, password_hash, role, display_name, created_at
     FROM users WHERE email = $1`,
    [email.toLowerCase()],
  )
  return rows[0] ?? null
}

export async function findUserById(id) {
  const { rows } = await getPostgresPool().query(
    `SELECT id, email, role, display_name, created_at
     FROM users WHERE id = $1`,
    [id],
  )
  return rows[0] ?? null
}

export async function createUser({ email, passwordHash, role, displayName }) {
  const { rows } = await getPostgresPool().query(
    `INSERT INTO users (email, password_hash, role, display_name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, role, display_name, created_at`,
    [email.toLowerCase(), passwordHash, role, displayName],
  )
  return rows[0]
}

export async function listUsers({ role } = {}) {
  if (role) {
    const { rows } = await getPostgresPool().query(
      `SELECT id, email, role, display_name, created_at
       FROM users WHERE role = $1 ORDER BY created_at DESC`,
      [role],
    )
    return rows
  }
  const { rows } = await getPostgresPool().query(
    `SELECT id, email, role, display_name, created_at
     FROM users ORDER BY created_at DESC`,
  )
  return rows
}

export function toPublicUser(row) {
  if (!row) return null
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    displayName: row.display_name,
    createdAt: row.created_at,
  }
}
