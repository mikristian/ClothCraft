import {spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {copyFileSync,mkdirSync,readFileSync,statSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {homedir} from 'node:os'

const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
const manifest='rust/exo_sewing_guide_kernel/Cargo.toml'
const target=process.env.EXO_SEWING_GUIDE_TARGET_DIR||'rust/exo_sewing_guide_kernel/target'
const env={...process.env,CARGO_TARGET_DIR:target}
for(const args of [
  ['test','--manifest-path',manifest,'--locked','--offline'],
  ['build','--manifest-path',manifest,'--target','wasm32-unknown-unknown','--release','--locked','--offline'],
]){
  const result=spawnSync(cargo,args,{env,stdio:'inherit'})
  if(result.error)throw result.error
  if(result.status!==0)throw new Error(`Cargo ${args.join(' ')} exited ${result.status}`)
}
const wasm=join(target,'wasm32-unknown-unknown/release/exo_sewing_guide_kernel.wasm')
const output='public/wasm/exo_sewing_guide_kernel.wasm'
mkdirSync('public/wasm',{recursive:true})
copyFileSync(wasm,output)
const hash=createHash('sha256').update(readFileSync(output)).digest('hex')
writeFileSync('public/wasm/exo_sewing_guide_kernel.sha256',`${hash}  exo_sewing_guide_kernel.wasm\n`)
console.log(JSON.stringify({pass:true,wasm:output,bytes:statSync(output).size,sha256:hash,abi:1}))
