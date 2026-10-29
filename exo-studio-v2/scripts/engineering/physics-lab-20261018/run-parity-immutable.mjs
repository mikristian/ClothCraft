#!/usr/bin/env node
// Runs exact same executable bytes through CPU and Metal paths. By default
// this is a *blocking numerical parity gate*, not a throughput benchmark.
// Never touches a packaged app or user pattern/project files.
import { spawnSync } from 'node:child_process'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const source = resolve(process.env.EXO_PHYSICS_BINARY || join(root, 'research/oss/clothcraft/target/debug/exo-session'))
const runScript = resolve(dirname(fileURLToPath(import.meta.url)), 'run.mjs')
const compareScript = resolve(dirname(fileURLToPath(import.meta.url)), 'compare-cpu-gpu.mjs')
const validateScript = resolve(dirname(fileURLToPath(import.meta.url)), 'validate-parity.mjs')
const steps = Number(process.env.EXO_PHYSICS_STEPS || 40)
if (!Number.isSafeInteger(steps) || steps < 1 || steps > 100) throw Error('Steps must be an integer in [1,100]')
const timestamp = new Date().toISOString().replace(/[^0-9A-Za-z]/g, '')
const base = resolve(process.env.EXO_PARITY_OUTPUT_DIR || join(root, `.exo-build-scratch/physics-parity-${timestamp}-${process.pid}`))
await mkdir(base, { recursive: true })
const binary = join(base, 'exo-session')
await copyFile(source, binary)
const digest = data => createHash('sha256').update(data).digest('hex')
const sourceSha = digest(await readFile(source))
const copiedSha = digest(await readFile(binary))
if (sourceSha !== copiedSha) throw Error('Immutable executable snapshot did not match source bytes')
const cpu = join(base, 'cpu.json')
const gpu = join(base, 'gpu.json')
const result = join(base, 'comparison.json')
const validation = join(base, 'validation.json')
function run(label, command, args, env = {}) {
  const child = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: Number(process.env.EXO_PARITY_TIMEOUT_MS || 240000),
    maxBuffer: 2 * 1024 * 1024,
  })
  if (child.stdout) process.stdout.write(child.stdout)
  if (child.stderr) process.stderr.write(child.stderr)
  if (child.error) throw Error(`${label}: ${child.error.message}`)
  if (child.status !== 0) throw Error(`${label} failed with exit ${child.status}; retained ${base}`)
}
const common = { EXO_PHYSICS_BINARY: binary, EXO_PHYSICS_STEPS: String(steps) }
run('CPU fixture', process.execPath, [runScript], { ...common, EXO_PHYSICS_GPU: '0', EXO_PHYSICS_OUTPUT: cpu })
run('Metal GPU fixture', process.execPath, [runScript], { ...common, EXO_PHYSICS_GPU: '1', EXO_PHYSICS_OUTPUT: gpu })
// Preserve an explicit validation artifact even when physical parity diverges.
run('Immutable fixture validation', process.execPath, [validateScript, cpu, gpu, validation, String(steps)])
// Always save comparison before applying strict parity status. An expected
// parity failure should leave evidence of both matched experimental runs.
run('Physics comparison report', process.execPath, [compareScript, cpu, gpu, result], { EXO_PHYSICS_PARITY_STRICT: '0' })
const comparison = JSON.parse(await readFile(result, 'utf8'))
const manifest = { schema: 'exo.physics-immutable-parity.v1', binary, sha256: copiedSha, originalSource: source, steps, cpu, gpu, validation, comparison: result, parityStatus: comparison.acceptance, releaseGate: comparison.acceptance !== 'WITHIN_PRELIMINARY_NUMERICAL_SCREEN' ? 'blocked' : 'further_fit_validation_required' }
await writeFile(join(base, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(JSON.stringify({ manifest: join(base, 'manifest.json'), parityStatus: comparison.acceptance, releaseGate: manifest.releaseGate }, null, 2))
if (process.env.EXO_PHYSICS_PARITY_STRICT !== '0' && comparison.acceptance !== 'WITHIN_PRELIMINARY_NUMERICAL_SCREEN') process.exitCode = 1
