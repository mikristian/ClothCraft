import {spawnSync} from 'node:child_process'
import {mkdirSync,copyFileSync,readFileSync,writeFileSync,statSync} from 'node:fs'
import {join} from 'node:path'
import {homedir} from 'node:os'
import {createHash} from 'node:crypto'

const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
const manifest='rust/exo_allowance_preview_kernel/Cargo.toml'
const target=process.env.EXO_ALLOWANCE_TARGET_DIR||'rust/exo_allowance_preview_kernel/target'
const env={...process.env,CARGO_TARGET_DIR:target}
const run=(bin,args)=>{
  const result=spawnSync(bin,args,{env,stdio:'inherit'})
  if(result.error)throw result.error
  if(result.status!==0)throw Error(`${bin} ${args.join(' ')} exited ${result.status}`)
}
run(cargo,['test','--manifest-path',manifest,'--locked','--offline'])
run(cargo,['build','--manifest-path',manifest,'--locked','--offline',
  '--target','wasm32-unknown-unknown','--release'])
const source=join(target,'wasm32-unknown-unknown/release/exo_allowance_preview_kernel.wasm')
const destination='public/wasm/exo_allowance_preview_kernel.wasm'
if(!statSync(source,{throwIfNoEntry:false})?.size)throw Error('Rust allowance WASM not built')
mkdirSync('public/wasm',{recursive:true})
copyFileSync(source,destination)
const hash=createHash('sha256').update(readFileSync(destination)).digest('hex')
writeFileSync('public/wasm/exo_allowance_preview_kernel.sha256',`${hash}  exo_allowance_preview_kernel.wasm\n`)
run(process.execPath,['scripts/qa-rust-allowance-preview-kernel.mjs'])
run(process.execPath,['--test','src/core/patternAllowancePreview.test.mjs'])
console.log(JSON.stringify({pass:true,wasm:destination,sha256:hash}))
