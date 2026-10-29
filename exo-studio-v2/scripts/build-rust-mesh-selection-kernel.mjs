import {spawnSync} from 'node:child_process'
import {mkdirSync,copyFileSync,statSync} from 'node:fs'
import {join} from 'node:path'
import {homedir} from 'node:os'
const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
const manifest='rust/exo_mesh_selection_kernel/Cargo.toml'
const targetDir=process.env.EXO_MESH_SELECTION_TARGET_DIR||'rust/exo_mesh_selection_kernel/target'
const env={...process.env,CARGO_TARGET_DIR:targetDir}
for(const args of [['test','--manifest-path',manifest,'--offline'],['build','--manifest-path',manifest,'--target','wasm32-unknown-unknown','--release','--offline']]) {
  const run=spawnSync(cargo,args,{stdio:'inherit',env})
  if(run.error || run.status!==0)throw Error(`cargo ${args.join(' ')} failed: ${run.error?.message??run.status}`)
}
const source=join(targetDir,'wasm32-unknown-unknown/release/exo_mesh_selection_kernel.wasm')
const output='public/wasm/exo_mesh_selection_kernel.wasm'
mkdirSync('public/wasm',{recursive:true})
copyFileSync(source,output)
console.log(JSON.stringify({wasm:output,bytes:statSync(output).size}))
