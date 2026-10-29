import {spawnSync} from 'node:child_process'
import {mkdirSync,copyFileSync,statSync,readFileSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {homedir} from 'node:os'
import {createHash} from 'node:crypto'

const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
const manifest='rust/exo_label_layout_kernel/Cargo.toml'
const target=process.env.EXO_LABEL_LAYOUT_TARGET_DIR||'rust/exo_label_layout_kernel/target'
for(const args of [['test','--manifest-path',manifest,'--locked','--offline'],['build','--manifest-path',manifest,'--release','--target','wasm32-unknown-unknown','--locked','--offline']]){
  const result=spawnSync(cargo,args,{stdio:'inherit',env:{...process.env,CARGO_TARGET_DIR:target}})
  if(result.error||result.status!==0)throw Error(`Rust label layout build failed: ${result.error?.message??result.status}`)
}
mkdirSync('public/wasm',{recursive:true})
const source=join(target,'wasm32-unknown-unknown/release/exo_label_layout_kernel.wasm')
if(!statSync(source,{throwIfNoEntry:false})?.size)throw Error('Missing Rust label layout WASM')
const out='public/wasm/exo_label_layout_kernel.wasm'
copyFileSync(source,out)
const hash=createHash('sha256').update(readFileSync(out)).digest('hex')
writeFileSync('public/wasm/exo_label_layout_kernel.sha256',`${hash}  exo_label_layout_kernel.wasm\n`)
if(hash!==createHash('sha256').update(readFileSync(out)).digest('hex'))throw Error('Label layout checksum mismatch')
console.log(JSON.stringify({file:out,bytes:statSync(out).size,sha256:hash}))
