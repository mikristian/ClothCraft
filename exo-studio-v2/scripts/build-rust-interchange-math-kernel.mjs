import {spawnSync} from 'node:child_process'
import {copyFileSync,mkdirSync,readFileSync,statSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {homedir} from 'node:os'
import {join} from 'node:path'
const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
const manifest='rust/exo_interchange_math_kernel/Cargo.toml'
const target='rust/exo_interchange_math_kernel/target'
for(const args of [['test','--manifest-path',manifest,'--offline'],
  ['build','--manifest-path',manifest,'--target','wasm32-unknown-unknown','--release','--offline']]){
  const result=spawnSync(cargo,args,{stdio:'inherit',env:{...process.env,CARGO_TARGET_DIR:target}})
  if(result.error||result.status!==0)throw Error(`Interchange Rust ${args.join(' ')} failed: ${result.error?.message||result.status}`)
}
mkdirSync('public/wasm',{recursive:true})
const output='public/wasm/exo_interchange_math_kernel.wasm'
copyFileSync(join(target,'wasm32-unknown-unknown/release/exo_interchange_math_kernel.wasm'),output)
const sha256=createHash('sha256').update(readFileSync(output)).digest('hex')
writeFileSync('public/wasm/exo_interchange_math_kernel.sha256',`${sha256}  exo_interchange_math_kernel.wasm\n`)
console.log(JSON.stringify({pass:true,abi:1,bytes:statSync(output).size,sha256}))
