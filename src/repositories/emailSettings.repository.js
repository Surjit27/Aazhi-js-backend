import { getPostgresPool } from '../db/postgres.js'

const COLUMNS = `enabled, api_key_cipher, from_email, from_name, updated_at`

export async function getEmailSettingsRow() {
  const { rows } = await getPostgresPool().query(`SELECT ${COLUMNS} FROM email_settings WHERE id = TRUE`)
  return rows[0] ?? null
}

export async function saveEmailSettingsRow(fields) {
  const { rows } = await getPostgresPool().query(
    `UPDATE email_settings
     SET enabled = $1,
         api_key_cipher = $2,
         from_email = $3,
         from_name = $4,
         updated_at = NOW()
     WHERE id = TRUE
     RETURNING ${COLUMNS}`,
    [fields.enabled, fields.apiKeyCipher, fields.fromEmail, fields.fromName],
  )
  return rows[0]
}
