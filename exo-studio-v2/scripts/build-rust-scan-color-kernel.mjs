import {spawnSync} from 'node:child_process'
import {readFileSync,copyFileSync,writeFileSync,mkdirSync,statSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {join} from 'node:path'
import {homedir} from 'node:os'

const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
const manifest='rust/exo_scan_color_kernel/Cargo.toml'
const target='rust/exo_scan_color_kernel/target'
for(const args of [
  ['test','--manifest-path',manifest,'--offline'],
  ['build','--manifest-path',manifest,'--target','wasm32-unknown-unknown','--release','--offline'],
]){
  const command=spawnSync(cargo,args,{stdio:'inherit',env:{...process.env,CARGO_TARGET_DIR:target}})
  if(command.error||command.status!==0)throw Error(`Scan color Rust ${args.join(' ')} failed: ${command.error?.message||command.status}`)
}
mkdirSync('public/wasm',{recursive:true})
const output='public/wasm/exo_scan_color_kernel.wasm'
copyFileSync(join(target,'wasm32-unknown-unknown/release/exo_scan_color_kernel.wasm'),output)
const sha256=createHash('sha256').update(readFileSync(output)).digest('hex')
writeFileSync('public/wasm/exo_scan_color_kernel.sha256',`${sha256}  exo_scan_color_kernel.wasm\n`)
console.log(JSON.stringify({pass:true,abi:1,wasm:output,bytes:statSync(output).size,sha256}))
