import {spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {copyFileSync,mkdirSync,readFileSync,statSync,writeFileSync} from 'node:fs'
import {homedir} from 'node:os'
import {join} from 'node:path'
const manifest='rust/exo_distance_constraint_kernel/Cargo.toml'
const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
const target='rust/exo_distance_constraint_kernel/target'
for(const args of [['test','--manifest-path',manifest,'--offline'],
 ['build','--manifest-path',manifest,'--offline','--release','--target','wasm32-unknown-unknown']]){
  const run=spawnSync(cargo,args,{stdio:'inherit',env:{...process.env,CARGO_TARGET_DIR:target}})
  if(run.error||run.status!==0)throw Error(`Distance constraint Rust build failed: ${run.error?.message||run.status}`)
}
mkdirSync('public/wasm',{recursive:true})
const output='public/wasm/exo_distance_constraint_kernel.wasm'
copyFileSync(join(target,'wasm32-unknown-unknown/release/exo_distance_constraint_kernel.wasm'),output)
const sha256=createHash('sha256').update(readFileSync(output)).digest('hex')
writeFileSync('public/wasm/exo_distance_constraint_kernel.sha256',`${sha256}  exo_distance_constraint_kernel.wasm\n`)
console.log(JSON.stringify({pass:true,wasm:output,bytes:statSync(output).size,sha256,abi:1}))
