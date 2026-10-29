import {spawnSync} from 'node:child_process'
import {mkdirSync,copyFileSync,readFileSync,writeFileSync,statSync} from 'node:fs'
import {join} from 'node:path'
import {homedir} from 'node:os'
import {createHash} from 'node:crypto'

const manifest='rust/exo_vector_fit_kernel/Cargo.toml'
const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
const target=process.env.EXO_VECTOR_FIT_TARGET_DIR||'rust/exo_vector_fit_kernel/target'
const env={...process.env,CARGO_TARGET_DIR:target}
for(const args of [
  ['test','--manifest-path',manifest,'--locked','--offline'],
  ['build','--manifest-path',manifest,'--locked','--offline','--target','wasm32-unknown-unknown','--release'],
]){
  const result=spawnSync(cargo,args,{env,stdio:'inherit'})
  if(result.error)throw result.error
  if(result.status!==0)throw new Error(`Cargo ${args.join(' ')} exited ${result.status}`)
}
const source=join(target,'wasm32-unknown-unknown/release/exo_vector_fit_kernel.wasm')
if(!statSync(source,{throwIfNoEntry:false})?.isFile())throw new Error(`Missing vector fit WASM: ${source}`)
mkdirSync('public/wasm',{recursive:true})
const output='public/wasm/exo_vector_fit_kernel.wasm'
copyFileSync(source,output)
const contents=readFileSync(output)
if(!contents.length)throw new Error(`Empty vector fit WASM: ${output}`)
const sha256=createHash('sha256').update(contents).digest('hex')
writeFileSync('public/wasm/exo_vector_fit_kernel.sha256',`${sha256}  exo_vector_fit_kernel.wasm\n`)
const parity=spawnSync(process.execPath,['--test','rust/exo_vector_fit_kernel/parity.test.mjs'],{stdio:'inherit',env})
if(parity.error)throw parity.error
if(parity.status!==0)throw new Error(`Vector fit parity exited ${parity.status}`)
console.log(JSON.stringify({pass:true,wasm:output,bytes:contents.length,sha256,abi:1}))
