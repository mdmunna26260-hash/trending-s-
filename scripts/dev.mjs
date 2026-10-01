// Development entrypoint: boots embedded PostgreSQL, syncs the schema, seeds
// demo data on first run and then starts the Next.js dev server.
import { spawn } from 'node:child_process'
import net from 'node:net'

const useEmbedded = !process.env.DATABASE_URL || /127\.0\.0\.1|localhost/.test(process.env.DATABASE_URL)

const waitForPort = (port, host = '127.0.0.1', timeoutMs = 60000) =>
  new Promise((resolve) => {
    const started = Date.now()
    const attempt = () => {
      const socket = net.connect({ port, host })
      socket.once('connect', () => {
        socket.destroy()
        resolve(true)
      })
      socket.once('error', () => {
        socket.destroy()
        if (Date.now() - started > timeoutMs) return resolve(false)
        setTimeout(attempt, 500)
      })
    }
    attempt()
  })

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options })
    child.on('error', reject)
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`))))
  })

let dbProcess = null
const cleanup = () => {
  dbProcess?.kill('SIGTERM')
  process.exit(0)
}
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

try {
  if (useEmbedded) {
    if (!(await waitForPort(5432, '127.0.0.1', 3000))) {
      console.log('[dev] starting embedded PostgreSQL...')
      dbProcess = spawn(process.execPath, ['scripts/db-up.mjs'], { stdio: 'inherit' })
      const ready = await waitForPort(5432, '127.0.0.1', 90000)
      if (!ready) throw new Error('PostgreSQL did not become ready')
    } else {
      console.log('[dev] PostgreSQL already running')
    }
  }

  console.log('[dev] syncing database schema...')
  await run('npx', ['prisma', 'db', 'push', '--skip-generate'], { shell: process.platform === 'win32' })

  console.log('[dev] checking seed data...')
  await run('npx', ['tsx', 'prisma/seed.ts'], { shell: process.platform === 'win32' })

  console.log('[dev] starting Next.js...')
  await run('npx', ['next', 'dev', '-p', process.env.PORT || '3000', '-H', '0.0.0.0'], {
    shell: process.platform === 'win32',
  })
} catch (error) {
  console.error('[dev]', error.message)
  cleanup()
}
