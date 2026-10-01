#!/usr/bin/env node
/**
 * Tiny helper for one-off Prisma queries from the command line, e.g.
 *   node scripts/db-query.mjs 'SELECT slug, "price" FROM "Product" LIMIT 5'
 *   node scripts/db-query.mjs --raw 'SELECT count(*) FROM "Product"'
 * Reads DATABASE_URL from the environment.
 */
import { PrismaClient } from '@prisma/client'

const args = process.argv.slice(2)
const raw = args.includes('--raw')
const query = args.find((arg) => !arg.startsWith('--'))

if (!query) {
  console.error('usage: node scripts/db-query.mjs <sql> [--raw]')
  process.exit(1)
}

const prisma = new PrismaClient()
try {
  if (raw || /^\s*(select|with)\b/i.test(query)) {
    const rows = await prisma.$queryRawUnsafe(query)
    console.log(JSON.stringify(rows, (_k, v) => (typeof v === 'bigint' ? Number(v) : v), 2))
  } else {
    const affected = await prisma.$executeRawUnsafe(query)
    console.log(`${affected} row(s) affected`)
  }
} finally {
  await prisma.$disconnect()
}
