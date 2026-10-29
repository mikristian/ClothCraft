import { spawnSync } from 'node:child_process'
import { copyFileSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { homedir } from 'node:os'

const cargo = process.env.CARGO || join(homedir(), '.cargo/bin/cargo')
const manifest = 'rust/exo_mesh_avatar_contact_kernel/Cargo.toml'
const target = 'rust/exo_mesh_avatar_contact_kernel/target'
for (const args of [['test', '--manifest-path', manifest, '--offline'], ['build', '--manifest-path', manifest, '--release', '--target', 'wasm32-unknown-unknown', '--offline']]) {
  const result = spawnSync(cargo, args, { env: { ...process.env, CARGO_TARGET_DIR: target }, stdio: 'inherit' })
  if (result.error || result.status !== 0) throw Error(`Mesh contact Rust failed: ${result.error?.message || result.status}`)
}
const name = 'exo_mesh_avatar_contact_kernel.wasm'
mkdirSync('public/wasm', { recursive: true })
copyFileSync(join(target, 'wasm32-unknown-unknown/release', name), join('public/wasm', name))
const data = readFileSync(join('public/wasm', name))
const sha256 = createHash('sha256').update(data).digest('hex')
writeFileSync('public/wasm/exo_mesh_avatar_contact_kernel.sha256', `${sha256}  ${name}\n`)
const qa = spawnSync(process.execPath, ['scripts/qa-rust-mesh-avatar-contact-20261021.mjs'], { stdio: 'inherit' })
if (qa.error || qa.status !== 0) throw Error(`Mesh contact parity failed: ${qa.error?.message || qa.status}`)
console.log(JSON.stringify({ pass: true, bytes: data.length, sha256 }))
