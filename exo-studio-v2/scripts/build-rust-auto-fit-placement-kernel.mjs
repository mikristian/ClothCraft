import {spawnSync} from 'node:child_process'
import {mkdirSync,copyFileSync,readFileSync,writeFileSync,statSync} from 'node:fs'
import {join} from 'node:path'
import {homedir} from 'node:os'
import {createHash} from 'node:crypto'

const manifest='rust/exo_auto_fit_placement_kernel/Cargo.toml'
const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
const target=process.env.EXO_AUTO_FIT_PLACEMENT_TARGET_DIR||'rust/exo_auto_fit_placement_kernel/target'
const env={...process.env,CARGO_TARGET_DIR:target}
for(const args of [
  ['test','--manifest-path',manifest,'--locked','--offline'],
  ['build','--manifest-path',manifest,'--locked','--offline','--release','--target','wasm32-unknown-unknown'],
]){
  const result=spawnSync(cargo,args,{stdio:'inherit',env})
  if(result.error)throw result.error
  if(result.status!==0)throw Error(`Cargo ${args.join(' ')} failed (${result.status})`)
}
const source=join(target,'wasm32-unknown-unknown/release/exo_auto_fit_placement_kernel.wasm')
const dest='public/wasm/exo_auto_fit_placement_kernel.wasm'
mkdirSync('public/wasm',{recursive:true})
copyFileSync(source,dest)
const sha256=createHash('sha256').update(readFileSync(dest)).digest('hex')
writeFileSync('public/wasm/exo_auto_fit_placement_kernel.sha256',sha256+'  exo_auto_fit_placement_kernel.wasm\n')
console.log(JSON.stringify({pass:true,wasm:dest,bytes:statSync(dest).size,sha256,abi:1}))
