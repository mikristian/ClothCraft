import {spawnSync} from 'node:child_process'
import {copyFileSync,mkdirSync,readFileSync,writeFileSync,statSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {join} from 'node:path'
import {homedir} from 'node:os'
const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
const manifest='rust/exo_free_sewing_kernel/Cargo.toml'
const target=process.env.EXO_FREE_SEWING_TARGET_DIR||'rust/exo_free_sewing_kernel/target'
const env={...process.env,CARGO_TARGET_DIR:target}
for(const args of [['test','--manifest-path',manifest,'--locked','--offline'],['build','--manifest-path',manifest,'--locked','--offline','--release','--target','wasm32-unknown-unknown']]){
  const run=spawnSync(cargo,args,{env,stdio:'inherit'});if(run.error)throw run.error;if(run.status!==0)throw Error(`cargo ${args.join(' ')} failed (${run.status})`)
}
const source=join(target,'wasm32-unknown-unknown/release/exo_free_sewing_kernel.wasm')
if(!statSync(source,{throwIfNoEntry:false})?.isFile())throw Error(`Missing Rust Free Sewing WASM: ${source}`)
mkdirSync('public/wasm',{recursive:true})
const output='public/wasm/exo_free_sewing_kernel.wasm'
copyFileSync(source,output)
const bytes=readFileSync(output),sha256=createHash('sha256').update(bytes).digest('hex')
writeFileSync('public/wasm/exo_free_sewing_kernel.sha256',`${sha256}  exo_free_sewing_kernel.wasm\n`)
for(const args of [['--test','rust/exo_free_sewing_kernel/parity.test.mjs'],['scripts/check-free-sewing-cutline-integrity.mjs']]){
  const run=spawnSync(process.execPath,args,{stdio:'inherit',env});if(run.error)throw run.error;if(run.status!==0)throw Error(`node ${args.join(' ')} failed (${run.status})`)
}
console.log(JSON.stringify({pass:true,wasm:output,bytes:bytes.length,sha256,abi:1}))
