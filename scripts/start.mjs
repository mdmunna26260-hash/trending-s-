// Production entrypoint: starts Next.js (assumes DATABASE_URL is reachable).
import { spawn } from 'node:child_process'

const child = spawn('npx', ['next', 'start', '-p', process.env.PORT || '3000', '-H', '0.0.0.0'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

child.on('exit', (code) => process.exit(code ?? 1))
