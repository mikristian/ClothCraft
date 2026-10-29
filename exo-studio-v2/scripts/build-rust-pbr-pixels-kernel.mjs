import {spawnSync} from 'node:child_process'
import {readFileSync,copyFileSync,mkdirSync,writeFileSync,statSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {homedir} from 'node:os'
import {join} from 'node:path'

const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
const manifest='rust/exo_pbr_pixels_kernel/Cargo.toml'
const target='rust/exo_pbr_pixels_kernel/target'
for(const args of [['test','--manifest-path',manifest,'--offline'],
  ['build','--manifest-path',manifest,'--target','wasm32-unknown-unknown','--release','--offline']]){
 const r=spawnSync(cargo,args,{stdio:'inherit',env:{...process.env,CARGO_TARGET_DIR:target}})
 if(r.error||r.status!==0)throw Error(`PBR Rust ${args.join(' ')} failed: ${r.error?.message||r.status}`)
}
mkdirSync('public/wasm',{recursive:true})
const file='public/wasm/exo_pbr_pixels_kernel.wasm'
copyFileSync(join(target,'wasm32-unknown-unknown/release/exo_pbr_pixels_kernel.wasm'),file)
const sha256=createHash('sha256').update(readFileSync(file)).digest('hex')
writeFileSync('public/wasm/exo_pbr_pixels_kernel.sha256',`${sha256}  exo_pbr_pixels_kernel.wasm\n`)
console.log(JSON.stringify({pass:true,abi:1,bytes:statSync(file).size,sha256}))
