import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { homedir } from 'node:os'
import { join } from 'node:path'
const cargo = process.env.CARGO || join(homedir(), '.cargo/bin/cargo')
const manifest = 'rust/exo_measurement_kernel/Cargo.toml'
const target = process.env.EXO_MEASUREMENT_TARGET_DIR || 'rust/exo_measurement_kernel/target'
const env = { ...process.env, CARGO_TARGET_DIR: target }
function run(command, args) {
  const result = spawnSync(command, args, { env, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (${result.status})`)
}
run(cargo, ['test', '--manifest-path', manifest, '--locked', '--offline'])
run(cargo, ['build', '--manifest-path', manifest, '--locked', '--offline', '--release', '--target', 'wasm32-unknown-unknown'])
mkdirSync('public/wasm', { recursive: true })
const output = 'public/wasm/exo_measurement_kernel.wasm'
copyFileSync(join(target, 'wasm32-unknown-unknown/release/exo_measurement_kernel.wasm'), output)
const bytes = readFileSync(output)
const sha256 = createHash('sha256').update(bytes).digest('hex')
writeFileSync('public/wasm/exo_measurement_kernel.sha256', `${sha256}  exo_measurement_kernel.wasm\n`)
run(process.execPath, ['rust/exo_measurement_kernel/parity.test.mjs'])
run(process.execPath, ['scripts/check-native-cpp-measurements.mjs'])
console.log(JSON.stringify({ pass: true, artifact: output, size: bytes.length, sha256 }))
