import {spawnSync} from 'node:child_process'
import {mkdirSync,copyFileSync,readFileSync,writeFileSync,statSync} from 'node:fs'
import {join} from 'node:path'
import {homedir} from 'node:os'
import {createHash} from 'node:crypto'
const manifest='rust/exo_project_area_kernel/Cargo.toml'
const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo')
const target=process.env.EXO_PROJECT_AREA_TARGET||'rust/exo_project_area_kernel/target'
for(const args of [['test','--manifest-path',manifest,'--offline'],['build','--manifest-path',manifest,'--release','--offline','--target','wasm32-unknown-unknown']]){
  const result=spawnSync(cargo,args,{stdio:'inherit',env:{...process.env,CARGO_TARGET_DIR:target}})
  if(result.error)throw result.error
  if(result.status!==0)throw Error(`Cargo ${args.join(' ')} failed: ${result.status}`)
}
const name='exo_project_area_kernel.wasm',dest=`public/wasm/${name}`
mkdirSync('public/wasm',{recursive:true})
copyFileSync(join(target,'wasm32-unknown-unknown/release',name),dest)
const digest=createHash('sha256').update(readFileSync(dest)).digest('hex')
writeFileSync('public/wasm/exo_project_area_kernel.sha256',`${digest}  ${name}\n`)
console.log(JSON.stringify({pass:true,bytes:statSync(dest).size,digest}))
