import {spawnSync} from 'node:child_process'
import {mkdirSync,copyFileSync,statSync,readFileSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {homedir} from 'node:os'
import {createHash} from 'node:crypto'
const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
const manifest='rust/exo_preflight_crossing_kernel/Cargo.toml'
const target=process.env.EXO_PREFLIGHT_CROSSING_TARGET_DIR||'rust/exo_preflight_crossing_kernel/target'
for(const args of [['test','--manifest-path',manifest,'--locked','--offline'],['build','--manifest-path',manifest,'--release','--target','wasm32-unknown-unknown','--locked','--offline']]){
  const result=spawnSync(cargo,args,{stdio:'inherit',env:{...process.env,CARGO_TARGET_DIR:target}})
  if(result.error||result.status!==0)throw Error(`Preflight crossing Rust build failed: ${result.error?.message??result.status}`)
}
mkdirSync('public/wasm',{recursive:true})
const source=join(target,'wasm32-unknown-unknown/release/exo_preflight_crossing_kernel.wasm')
if(!statSync(source,{throwIfNoEntry:false})?.size)throw Error('Missing preflight crossing WASM')
const out='public/wasm/exo_preflight_crossing_kernel.wasm'
copyFileSync(source,out)
const digest=createHash('sha256').update(readFileSync(out)).digest('hex')
writeFileSync('public/wasm/exo_preflight_crossing_kernel.sha256',`${digest}  exo_preflight_crossing_kernel.wasm\n`)
if(digest!==createHash('sha256').update(readFileSync(out)).digest('hex'))throw Error('Crossing WASM hash mismatch')
console.log(JSON.stringify({file:out,bytes:statSync(out).size,sha256:digest}))
