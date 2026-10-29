import { spawnSync } from 'node:child_process'
import { mkdirSync, copyFileSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

const cargo = process.env.CARGO || join(homedir(), '.cargo/bin/cargo')
const manifest = 'rust/exo_marker_kernel/Cargo.toml'
const target = process.env.EXO_MARKER_TARGET_DIR || 'rust/exo_marker_kernel/target'
const env = { ...process.env, CARGO_INCREMENTAL: '0', CARGO_TARGET_DIR: target }
for (const args of [
  ['test', '--manifest-path', manifest, '--locked', '--offline', '-j', '2'],
  ['build', '--manifest-path', manifest, '--locked', '--offline', '--release',
    '--target', 'wasm32-unknown-unknown', '-j', '2'],
]) {
  const result = spawnSync(cargo, args, { env, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`Cargo ${args.join(' ')} failed: ${result.status}`)
}
const source = join(target, 'wasm32-unknown-unknown/release/exo_marker_kernel.wasm')
const destination = 'public/wasm/exo_marker_kernel.wasm'
mkdirSync('public/wasm', { recursive: true })
copyFileSync(source, destination)
const sha256 = createHash('sha256').update(readFileSync(destination)).digest('hex')
writeFileSync('public/wasm/exo_marker_kernel.sha256', `${sha256}  exo_marker_kernel.wasm\n`)
console.log(JSON.stringify({ pass: true, wasm: destination, bytes: statSync(destination).size, sha256, abi: 1 }))
