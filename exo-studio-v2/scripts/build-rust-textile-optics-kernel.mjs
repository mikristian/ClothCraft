import {spawnSync} from 'node:child_process'
import {copyFileSync,mkdirSync,readFileSync,writeFileSync,statSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {homedir} from 'node:os'
import {join} from 'node:path'
const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
const manifest='rust/exo_textile_optics_kernel/Cargo.toml'
const target='rust/exo_textile_optics_kernel/target'
for(const args of [['test','--manifest-path',manifest,'--offline'],
 ['build','--manifest-path',manifest,'--target','wasm32-unknown-unknown','--release','--offline']]){
 const r=spawnSync(cargo,args,{stdio:'inherit',env:{...process.env,CARGO_TARGET_DIR:target}})
 if(r.error||r.status!==0)throw Error(`Textile Rust ${args.join(' ')} failed ${r.error?.message||r.status}`)
}
mkdirSync('public/wasm',{recursive:true})
const output='public/wasm/exo_textile_optics_kernel.wasm'
copyFileSync(join(target,'wasm32-unknown-unknown/release/exo_textile_optics_kernel.wasm'),output)
const sha256=createHash('sha256').update(readFileSync(output)).digest('hex')
writeFileSync('public/wasm/exo_textile_optics_kernel.sha256',`${sha256}  exo_textile_optics_kernel.wasm\n`)
console.log(JSON.stringify({pass:true,abi:1,bytes:statSync(output).size,sha256}))
