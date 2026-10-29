import {spawnSync} from 'node:child_process'
import {mkdirSync,copyFileSync,statSync,readFileSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {homedir} from 'node:os'
import {createHash} from 'node:crypto'

const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
const manifest='rust/exo_fabric_kernel/Cargo.toml'
const target='wasm32-unknown-unknown'
const env={...process.env,CARGO_TARGET_DIR:process.env.EXO_FABRIC_CARGO_TARGET||'rust/exo_fabric_kernel/target'}
const run=args=>{
  const result=spawnSync(cargo,args,{env,stdio:'inherit'})
  if(result.error)throw result.error
  if(result.status!==0)throw new Error(`Rust cargo ${args.join(' ')} failed: ${result.status}`)
}

run(['test','--manifest-path',manifest,'--offline'])
run(['build','--manifest-path',manifest,'--target',target,'--release','--offline'])
const original=join(env.CARGO_TARGET_DIR,target,'release/exo_fabric_kernel.wasm')
const destination='public/wasm/exo_fabric_kernel.wasm'
mkdirSync('public/wasm',{recursive:true})
copyFileSync(original,destination)
const bytes=readFileSync(destination)
const digest=createHash('sha256').update(bytes).digest('hex')
writeFileSync('public/wasm/exo_fabric_kernel.sha256',digest+'  exo_fabric_kernel.wasm\n')
console.log(JSON.stringify({wasm:destination,size:statSync(destination).size,sha256:digest,abi:2},null,2))
