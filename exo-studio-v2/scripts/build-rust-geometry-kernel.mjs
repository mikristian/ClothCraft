import {spawnSync} from 'node:child_process'
import {mkdirSync,copyFileSync,statSync,readFileSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {homedir} from 'node:os'
import {createHash} from 'node:crypto'

const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
const manifest='rust/exo_geometry_kernel/Cargo.toml'
const env={...process.env,CARGO_TARGET_DIR:process.env.EXO_GEOMETRY_TARGET_DIR||'rust/exo_geometry_kernel/target'}
for(const args of [
  ['test','--manifest-path',manifest,'--offline'],
  ['build','--manifest-path',manifest,'--target','wasm32-unknown-unknown','--release','--offline'],
]){
  const result=spawnSync(cargo,args,{env,stdio:'inherit'})
  if(result.error)throw result.error
  if(result.status!==0)throw new Error(`Cargo ${args.join(' ')} exited ${result.status}`)
}
const source=join(env.CARGO_TARGET_DIR,'wasm32-unknown-unknown/release/exo_geometry_kernel.wasm')
const output='public/wasm/exo_geometry_kernel.wasm'
mkdirSync('public/wasm',{recursive:true})
copyFileSync(source,output)
const hash=createHash('sha256').update(readFileSync(output)).digest('hex')
writeFileSync('public/wasm/exo_geometry_kernel.sha256',hash+'  exo_geometry_kernel.wasm\n')
console.log(JSON.stringify({pass:true,wasm:output,bytes:statSync(output).size,sha256:hash,abi:1}))
