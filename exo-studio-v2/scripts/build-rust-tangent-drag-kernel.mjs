import {spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {copyFileSync,mkdirSync,readFileSync,statSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {homedir} from 'node:os'
const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
const manifest='rust/exo_tangent_drag_kernel/Cargo.toml'
const target=process.env.EXO_TANGENT_DRAG_TARGET_DIR||'rust/exo_tangent_drag_kernel/target'
for(const args of [['test','--manifest-path',manifest,'--offline'],['build','--manifest-path',manifest,'--target','wasm32-unknown-unknown','--release','--offline']]){
  const result=spawnSync(cargo,args,{env:{...process.env,CARGO_TARGET_DIR:target},stdio:'inherit'})
  if(result.error)throw result.error
  if(result.status!==0)throw Error(`Cargo ${args.join(' ')} exited ${result.status}`)
}
const output='public/wasm/exo_tangent_drag_kernel.wasm'
mkdirSync('public/wasm',{recursive:true})
copyFileSync(join(target,'wasm32-unknown-unknown/release/exo_tangent_drag_kernel.wasm'),output)
const sha256=createHash('sha256').update(readFileSync(output)).digest('hex')
writeFileSync('public/wasm/exo_tangent_drag_kernel.sha256',`${sha256}  exo_tangent_drag_kernel.wasm\n`)
console.log(JSON.stringify({pass:true,wasm:output,bytes:statSync(output).size,sha256,abi:1}))
