import {spawnSync} from 'node:child_process'
import {copyFileSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {homedir} from 'node:os'
import {join} from 'node:path'
const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
const manifest='rust/exo_precision_polar_kernel/Cargo.toml'
const target=process.env.EXO_PRECISION_POLAR_TARGET||'rust/exo_precision_polar_kernel/target'
const env={...process.env,CARGO_TARGET_DIR:target}
for(const args of [['test','--manifest-path',manifest,'--offline'],['build','--manifest-path',manifest,'--target','wasm32-unknown-unknown','--release','--offline']]){
  const r=spawnSync(cargo,args,{env,stdio:'inherit'})
  if(r.error||r.status!==0)throw Error(`Polar Rust ${args.join(' ')} failed: ${r.error?.message||r.status}`)
}
const destination='public/wasm/exo_precision_polar_kernel.wasm'
mkdirSync('public/wasm',{recursive:true})
copyFileSync(join(target,'wasm32-unknown-unknown/release/exo_precision_polar_kernel.wasm'),destination)
const bytes=readFileSync(destination),sha256=createHash('sha256').update(bytes).digest('hex')
writeFileSync('public/wasm/exo_precision_polar_kernel.sha256',`${sha256}  exo_precision_polar_kernel.wasm\n`)
const qa=spawnSync(process.execPath,['scripts/qa-rust-precision-polar-20261021.mjs'],{stdio:'inherit',env})
if(qa.error||qa.status!==0)throw Error(`Polar parity failed: ${qa.error?.message||qa.status}`)
console.log(JSON.stringify({pass:true,bytes:bytes.length,sha256,abi:1}))
