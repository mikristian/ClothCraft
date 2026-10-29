import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync } from 'node:fs'
const root = new URL('../', import.meta.url)
const result = spawnSync('cargo', ['build', '--offline', '--release', '--target', 'wasm32-unknown-unknown', '--manifest-path', 'rust/exo_bom_kernel/Cargo.toml'], { cwd: root, stdio: 'inherit' })
if (result.error || result.status !== 0) throw result.error ?? Error(`cargo exited ${result.status}`)
mkdirSync(new URL('public/wasm/', root), { recursive: true })
copyFileSync(new URL('rust/exo_bom_kernel/target/wasm32-unknown-unknown/release/exo_bom_kernel.wasm', root), new URL('public/wasm/exo_bom_kernel.wasm', root))
