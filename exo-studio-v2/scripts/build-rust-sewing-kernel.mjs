import {spawnSync} from 'node:child_process'
import {mkdirSync,copyFileSync,statSync,readFileSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {homedir} from 'node:os'
import {createHash} from 'node:crypto'

const manifest='rust/exo_sewing_kernel/Cargo.toml'
const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
const target='wasm32-unknown-unknown'
const targetDir=process.env.EXO_SEWING_CARGO_TARGET||'rust/exo_sewing_kernel/target'
const env={...process.env,CARGO_TARGET_DIR:targetDir}
for(const args of [
  ['test','--manifest-path',manifest,'--offline'],
  ['build','--manifest-path',manifest,'--target',target,'--release','--offline'],
]){
  const result=spawnSync(cargo,args,{stdio:'inherit',env})
  if(result.error)throw result.error
  if(result.status!==0)throw new Error(`Cargo ${args.join(' ')} failed with ${result.status}`)
}
const output='public/wasm/exo_sewing_kernel.wasm'
mkdirSync('public/wasm',{recursive:true})
copyFileSync(join(targetDir,target,'release/exo_sewing_kernel.wasm'),output)
const digest=createHash('sha256').update(readFileSync(output)).digest('hex')
writeFileSync('public/wasm/exo_sewing_kernel.sha256',digest+'  exo_sewing_kernel.wasm\n')
console.log(JSON.stringify({pass:true,wasm:output,bytes:statSync(output).size,sha256:digest,abi:1}))
