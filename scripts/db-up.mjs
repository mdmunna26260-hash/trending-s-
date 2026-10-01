// Starts a local embedded PostgreSQL instance for development.
// In production set DATABASE_URL to a managed Postgres instead.
import EmbeddedPostgres from 'embedded-postgres'

const pg = new EmbeddedPostgres({
  databaseDir: process.env.PGDATA_DIR || './.pgdata',
  user: 'postgres',
  password: 'postgres',
  port: Number(process.env.PGPORT || 5432),
  persistent: true,
})

const shutdown = async () => {
  try {
    await pg.stop()
  } catch {
    /* already stopped */
  }
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

try {
  await pg.initialise()
  await pg.start()
  await pg.createDatabase('trending_s')
  console.log('[db] embedded PostgreSQL ready on port', process.env.PGPORT || 5432)
} catch (error) {
  console.error('[db] failed to start embedded PostgreSQL:', error.message)
  process.exit(1)
}

setInterval(() => {}, 1 << 30)
