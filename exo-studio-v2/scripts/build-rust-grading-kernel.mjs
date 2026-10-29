import {spawnSync} from 'node:child_process'
import {mkdirSync,copyFileSync,statSync,readFileSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {homedir} from 'node:os'
import {createHash} from 'node:crypto'
const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
const manifest='rust/exo_grading_kernel/Cargo.toml'
const env={...process.env,CARGO_TARGET_DIR:process.env.EXO_GRADING_TARGET_DIR||'rust/exo_grading_kernel/target'}
for(const args of [['test','--manifest-path',manifest,'--locked','--offline'],['build','--manifest-path',manifest,'--target','wasm32-unknown-unknown','--release','--locked','--offline']]){
 const result=spawnSync(cargo,args,{stdio:'inherit',env})
 if(result.error)throw result.error
 if(result.status!==0)throw Error(`cargo ${args.join(' ')} failed: ${result.status}`)
}
mkdirSync('public/wasm',{recursive:true})
const source=join(env.CARGO_TARGET_DIR,'wasm32-unknown-unknown/release/exo_grading_kernel.wasm')
const output='public/wasm/exo_grading_kernel.wasm'
if(!statSync(source,{throwIfNoEntry:false})?.isFile())throw Error(`Missing Rust grading WASM: ${source}`)
copyFileSync(source,output)
const bytes=readFileSync(output)
if(!bytes.length)throw Error(`Empty Rust grading WASM: ${output}`)
const sha256=createHash('sha256').update(bytes).digest('hex')
writeFileSync('public/wasm/exo_grading_kernel.sha256',`${sha256}  exo_grading_kernel.wasm\n`)
console.log(JSON.stringify({pass:true,wasm:output,bytes:bytes.length,sha256,abi:1}))
