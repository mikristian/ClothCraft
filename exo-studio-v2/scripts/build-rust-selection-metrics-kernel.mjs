import {spawnSync} from 'node:child_process'
import {mkdirSync,copyFileSync,statSync,readFileSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {homedir} from 'node:os'
import {createHash} from 'node:crypto'
const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
const manifest='rust/exo_selection_metrics_kernel/Cargo.toml'
const target=process.env.EXO_SELECTION_METRICS_TARGET_DIR||'rust/exo_selection_metrics_kernel/target'
for(const args of [['test','--manifest-path',manifest,'--locked','--offline'],['build','--manifest-path',manifest,'--release','--target','wasm32-unknown-unknown','--locked','--offline']]){
  const result=spawnSync(cargo,args,{stdio:'inherit',env:{...process.env,CARGO_TARGET_DIR:target}})
  if(result.error||result.status!==0)throw Error(`Rust build failed ${result.error?.message??result.status}`)
}
mkdirSync('public/wasm',{recursive:true})
const out='public/wasm/exo_selection_metrics_kernel.wasm'
const source=join(target,'wasm32-unknown-unknown/release/exo_selection_metrics_kernel.wasm')
if(!statSync(source,{throwIfNoEntry:false})?.isFile() || statSync(source).size===0)throw Error(`Missing or empty selection metrics WASM: ${source}`)
copyFileSync(source,out)
const bytes=readFileSync(out)
if(!bytes.length)throw Error(`Empty staged selection metrics WASM: ${out}`)
const sha256=createHash('sha256').update(bytes).digest('hex')
const checksumPath='public/wasm/exo_selection_metrics_kernel.sha256'
writeFileSync(checksumPath,`${sha256}  exo_selection_metrics_kernel.wasm\n`)
const recorded=readFileSync(checksumPath,'utf8')
if(recorded!==`${sha256}  exo_selection_metrics_kernel.wasm\n` ||
  createHash('sha256').update(readFileSync(out)).digest('hex')!==sha256)throw Error('Selection metrics WASM SHA-256 verification failed')
console.log(JSON.stringify({file:out,bytes:bytes.length,sha256,checksumPath}))
