import {spawnSync} from 'node:child_process'
import {mkdirSync, copyFileSync, readFileSync, writeFileSync, statSync} from 'node:fs'
import {join} from 'node:path'
import {homedir} from 'node:os'
import {createHash} from 'node:crypto'

const manifest = 'rust/exo_foam_triangulation_kernel/Cargo.toml'
const cargo = process.env.CARGO || join(homedir(), '.cargo/bin/cargo')
const target = process.env.EXO_FOAM_TRI_TARGET_DIR || 'rust/exo_foam_triangulation_kernel/target'
for (const args of [
  ['test', '--manifest-path', manifest, '--offline'],
  ['build', '--manifest-path', manifest, '--offline', '--release', '--target', 'wasm32-unknown-unknown']
]) {
  const result = spawnSync(cargo, args, {stdio:'inherit', env:{...process.env,CARGO_TARGET_DIR:target}})
  if (result.error) throw result.error
  if (result.status !== 0) throw Error(`Cargo ${args.join(' ')} failed (${result.status})`)
}
const filename = 'exo_foam_triangulation_kernel.wasm'
const dest = `public/wasm/${filename}`
mkdirSync('public/wasm', {recursive:true})
copyFileSync(join(target, `wasm32-unknown-unknown/release/${filename}`), dest)
const digest = createHash('sha256').update(readFileSync(dest)).digest('hex')
writeFileSync(`public/wasm/exo_foam_triangulation_kernel.sha256`, `${digest}  ${filename}\n`)
console.log(JSON.stringify({pass:true, wasm:dest, bytes:statSync(dest).size, sha256:digest}))
