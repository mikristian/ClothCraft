import {spawnSync} from 'node:child_process'
import {readFileSync,copyFileSync,mkdirSync,statSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {homedir} from 'node:os'
import {createHash} from 'node:crypto'

const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
const manifest='rust/exo_precision_chord_kernel/Cargo.toml'
const target=process.env.EXO_PRECISION_CHORD_TARGET||'rust/exo_precision_chord_kernel/target'
const env={...process.env,CARGO_TARGET_DIR:target}
for(const args of [
  ['test','--manifest-path',manifest,'--offline'],
  ['build','--manifest-path',manifest,'--target','wasm32-unknown-unknown','--release','--offline'],
]){
  const result=spawnSync(cargo,args,{env,stdio:'inherit'})
  if(result.error||result.status!==0)throw Error(`Rust precision chord: ${args.join(' ')} failed: ${result.error?.message||result.status}`)
}
const original=join(target,'wasm32-unknown-unknown/release/exo_precision_chord_kernel.wasm')
const destination='public/wasm/exo_precision_chord_kernel.wasm'
mkdirSync('public/wasm',{recursive:true})
copyFileSync(original,destination)
const sha256=createHash('sha256').update(readFileSync(destination)).digest('hex')
writeFileSync('public/wasm/exo_precision_chord_kernel.sha256',`${sha256}  exo_precision_chord_kernel.wasm\n`)
console.log(JSON.stringify({pass:true,wasm:destination,bytes:statSync(destination).size,sha256,abi:1}))
