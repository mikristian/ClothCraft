import {spawnSync} from 'node:child_process'
import {copyFileSync,mkdirSync,readFileSync,writeFileSync,statSync} from 'node:fs'
import {join} from 'node:path'
import {homedir} from 'node:os'
import {createHash} from 'node:crypto'
const manifest='rust/exo_staging_kernel/Cargo.toml'
const target=process.env.EXO_STAGING_TARGET_DIR||'rust/exo_staging_kernel/target'
const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
for(const args of [['test','--manifest-path',manifest,'--offline'],['build','--manifest-path',manifest,'--offline','--release','--target','wasm32-unknown-unknown']]){
  const result=spawnSync(cargo,args,{stdio:'inherit',env:{...process.env,CARGO_TARGET_DIR:target}})
  if(result.error)throw result.error
  if(result.status!==0)throw Error(`cargo ${args.join(' ')} failed (${result.status})`)
}
const dest='public/wasm/exo_staging_kernel.wasm'
mkdirSync('public/wasm',{recursive:true})
copyFileSync(join(target,'wasm32-unknown-unknown/release/exo_staging_kernel.wasm'),dest)
const sha256=createHash('sha256').update(readFileSync(dest)).digest('hex')
writeFileSync('public/wasm/exo_staging_kernel.sha256',sha256+'  exo_staging_kernel.wasm\n')
console.log(JSON.stringify({pass:true,wasm:dest,bytes:statSync(dest).size,sha256}))
