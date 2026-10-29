import {spawnSync} from 'node:child_process'
import {mkdirSync,copyFileSync,statSync,readFileSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {homedir} from 'node:os'
import {createHash} from 'node:crypto'

const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
const manifest='rust/exo_construction_kernel/Cargo.toml'
const env={...process.env,CARGO_TARGET_DIR:process.env.EXO_CONSTRUCTION_TARGET_DIR||'rust/exo_construction_kernel/target'}
function run(command,args){
 const result=spawnSync(command,args,{env,stdio:'inherit'})
 if(result.error)throw result.error
 if(result.status!==0)throw new Error(`${command} ${args.join(' ')} exited ${result.status}`)
}
run(cargo,['test','--manifest-path',manifest,'--locked','--offline'])
run(cargo,['build','--manifest-path',manifest,'--target','wasm32-unknown-unknown','--release','--locked','--offline'])

const source=join(env.CARGO_TARGET_DIR,'wasm32-unknown-unknown/release/exo_construction_kernel.wasm')
const output='public/wasm/exo_construction_kernel.wasm'
if(!statSync(source,{throwIfNoEntry:false})?.isFile())throw new Error(`Missing Rust construction WASM: ${source}`)
mkdirSync('public/wasm',{recursive:true})
copyFileSync(source,output)
const bytes=readFileSync(output)
if(!bytes.length)throw new Error(`Empty Rust construction WASM: ${output}`)
const sha256=createHash('sha256').update(bytes).digest('hex')
const checksum='public/wasm/exo_construction_kernel.sha256'
writeFileSync(checksum,`${sha256}  exo_construction_kernel.wasm\n`)
if(createHash('sha256').update(readFileSync(output)).digest('hex')!==sha256)throw new Error('Staged construction WASM SHA-256 mismatch')
run(process.execPath,['scripts/qa-rust-construction-kernel.mjs'])
console.log(JSON.stringify({pass:true,wasm:output,checksum,bytes:bytes.length,sha256,abi:1}))
