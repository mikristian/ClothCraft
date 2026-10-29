import {spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {copyFileSync,mkdirSync,readFileSync,statSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {homedir} from 'node:os'

const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
const manifest='rust/exo_self_collision_kernel/Cargo.toml'
const target=process.env.EXO_SELF_COLLISION_TARGET_DIR||'rust/exo_self_collision_kernel/target'
const env={...process.env,CARGO_TARGET_DIR:target}
for(const args of [
  ['test','--manifest-path',manifest,'--offline'],
  ['build','--manifest-path',manifest,'--target','wasm32-unknown-unknown','--release','--offline'],
]){
  const result=spawnSync(cargo,args,{env,stdio:'inherit'})
  if(result.error)throw result.error
  if(result.status!==0)throw new Error(`Cargo ${args.join(' ')} exited ${result.status}`)
}
const wasm=join(target,'wasm32-unknown-unknown/release/exo_self_collision_kernel.wasm')
const output='public/wasm/exo_self_collision_kernel.wasm'
mkdirSync('public/wasm',{recursive:true})
copyFileSync(wasm,output)
const hash=createHash('sha256').update(readFileSync(output)).digest('hex')
writeFileSync('public/wasm/exo_self_collision_kernel.sha256',`${hash}  exo_self_collision_kernel.wasm\n`)
console.log(JSON.stringify({pass:true,wasm:output,bytes:statSync(output).size,sha256:hash,abi:1}))

const parity=spawnSync(process.execPath,['scripts/qa-rust-self-collision-kernel.mjs'],{stdio:'inherit'})
if(parity.error)throw parity.error
if(parity.status!==0)throw new Error(`Self collision parity failed (${parity.status})`)
