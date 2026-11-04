import { execFile } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const require = createRequire(import.meta.url)

const globalForPrisma = globalThis

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export function applyPrismaMigrations() {
  const prismaCli = require.resolve('prisma/build/index.js')
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [prismaCli, 'migrate', 'deploy'], { cwd: root }, (err, stdout, stderr) => {
      if (stdout) process.stdout.write(stdout)
      if (stderr) process.stderr.write(stderr)
      if (err) reject(err)
      else resolve()
    })
  })
}

export async function connectPrisma() {
  await prisma.$connect()
}

export async function closePrisma() {
  await prisma.$disconnect()
}
