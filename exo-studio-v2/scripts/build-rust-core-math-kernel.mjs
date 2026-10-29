import {spawnSync} from 'node:child_process'
import {copyFileSync,mkdirSync,readFileSync,statSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {homedir} from 'node:os'
import {createHash} from 'node:crypto'

const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
const manifest='rust/exo_core_math_kernel/Cargo.toml'
const target=process.env.EXO_CORE_MATH_TARGET||'rust/exo_core_math_kernel/target'
for(const args of [
  ['test','--manifest-path',manifest,'--offline'],
  ['build','--manifest-path',manifest,'--target','wasm32-unknown-unknown','--release','--offline'],
]){
  const result=spawnSync(cargo,args,{stdio:'inherit',env:{...process.env,CARGO_TARGET_DIR:target}})
  if(result.error||result.status!==0)throw Error(`Core math cargo ${args.join(' ')} failed: ${result.error?.message||result.status}`)
}
mkdirSync('public/wasm',{recursive:true})
const filename='public/wasm/exo_core_math_kernel.wasm'
copyFileSync(join(target,'wasm32-unknown-unknown/release/exo_core_math_kernel.wasm'),filename)
const sha256=createHash('sha256').update(readFileSync(filename)).digest('hex')
writeFileSync('public/wasm/exo_core_math_kernel.sha256',`${sha256}  exo_core_math_kernel.wasm\n`)
console.log(JSON.stringify({pass:true,wasm:filename,bytes:statSync(filename).size,sha256,abi:1}))
