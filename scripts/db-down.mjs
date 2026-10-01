// Stops the local embedded PostgreSQL instance.
import EmbeddedPostgres from 'embedded-postgres'

const pg = new EmbeddedPostgres({
  databaseDir: process.env.PGDATA_DIR || './.pgdata',
  user: 'postgres',
  password: 'postgres',
  port: Number(process.env.PGPORT || 5432),
  persistent: true,
})

try {
  await pg.stop()
  console.log('[db] embedded PostgreSQL stopped')
} catch (error) {
  console.log('[db] nothing to stop:', error.message)
}
