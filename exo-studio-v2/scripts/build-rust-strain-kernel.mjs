import {spawnSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,statSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {homedir} from 'node:os'
import {join} from 'node:path'

const manifest='rust/exo_strain_kernel/Cargo.toml'
const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
const target=process.env.EXO_STRAIN_TARGET_DIR||'rust/exo_strain_kernel/target'
const env={...process.env,CARGO_TARGET_DIR:target}
for(const args of [
  ['test','--manifest-path',manifest,'--locked','--offline'],
  ['build','--manifest-path',manifest,'--locked','--offline','--release','--target','wasm32-unknown-unknown'],
]) {
  const result=spawnSync(cargo,args,{env,stdio:'inherit'})
  if(result.error)throw result.error
  if(result.status!==0)throw new Error(`Rust strain Cargo failed (${result.status}): ${args.join(' ')}`)
}
const binary=join(target,'wasm32-unknown-unknown/release/exo_strain_kernel.wasm')
if(!statSync(binary,{throwIfNoEntry:false})?.isFile())throw new Error(`Missing WASM ${binary}`)
const output='public/wasm/exo_strain_kernel.wasm'
mkdirSync('public/wasm',{recursive:true})
copyFileSync(binary,output)
const bytes=readFileSync(output)
if(!bytes.length)throw new Error('Empty Rust strain binary')
const sha256=createHash('sha256').update(bytes).digest('hex')
writeFileSync('public/wasm/exo_strain_kernel.sha256',`${sha256}  exo_strain_kernel.wasm\n`)
const result=spawnSync(process.execPath,['scripts/qa-rust-strain-kernel.mjs'],{env,stdio:'inherit'})
if(result.error)throw result.error
if(result.status!==0)throw new Error(`Rust strain differential test failed (${result.status})`)
console.log(JSON.stringify({pass:true,wasm:output,bytes:bytes.length,sha256,abi:1}))
