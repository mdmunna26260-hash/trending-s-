#!/usr/bin/env node
/**
 * Thin wrapper around the Prisma CLI.
 *
 * When pre-built engine binaries have been vendored into
 * node_modules/@prisma/engines (offline / restricted-network setups) they are
 * injected through the PRISMA_*_ENGINE_* environment variables so the CLI never
 * tries to reach binaries.prisma.sh. On a normal machine with network access
 * nothing is set and Prisma downloads its engines as usual.
 */
import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

const enginesDir = path.join(process.cwd(), 'node_modules', '@prisma', 'engines')

function find(prefix) {
  if (!existsSync(enginesDir)) return null
  const match = readdirSync(enginesDir).find((file) => file.startsWith(prefix))
  return match ? path.join(enginesDir, match) : null
}

const schemaEngine = find('schema-engine-')
const queryEngineLibrary = find('libquery_engine-')
const queryEngineBinary = find('query-engine-')

if (schemaEngine) process.env.PRISMA_SCHEMA_ENGINE_BINARY = schemaEngine
if (queryEngineLibrary) process.env.PRISMA_QUERY_ENGINE_LIBRARY = queryEngineLibrary
if (queryEngineBinary) process.env.PRISMA_QUERY_ENGINE_BINARY = queryEngineBinary

const args = process.argv.slice(2)
const child = spawn('node', [path.join('node_modules', 'prisma', 'build', 'index.js'), ...args], {
  stdio: 'inherit',
  env: process.env,
})

child.on('exit', (code) => process.exit(code ?? 1))
