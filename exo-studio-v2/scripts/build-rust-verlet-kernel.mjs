import {spawnSync} from 'node:child_process'
import {readFileSync,copyFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {join} from 'node:path'
import {homedir} from 'node:os'

const cargo=process.env.CARGO??join(homedir(),'.cargo/bin/cargo')
const manifest='rust/exo_verlet_kernel/Cargo.toml'
const target=process.env.EXO_VERLET_TARGET??'rust/exo_verlet_kernel/target'
const env={...process.env,CARGO_TARGET_DIR:target}
for(const args of [
  ['test','--manifest-path',manifest,'--offline'],
  ['build','--manifest-path',manifest,'--target','wasm32-unknown-unknown','--release','--offline']
]){
  const result=spawnSync(cargo,args,{env,stdio:'inherit'})
  if(result.error||result.status!==0)
    throw Error(`Verlet Cargo failed: ${result.error?.message??result.status}`)
}
mkdirSync('public/wasm',{recursive:true})
const name='exo_verlet_kernel.wasm'
const dest=join('public/wasm',name)
copyFileSync(join(target,'wasm32-unknown-unknown/release',name),dest)
const bytes=readFileSync(dest),sha256=createHash('sha256').update(bytes).digest('hex')
writeFileSync('public/wasm/exo_verlet_kernel.sha256',`${sha256}  ${name}\n`)
const qa=spawnSync(process.execPath,['scripts/qa-rust-verlet-seeded-20261021.mjs'],{stdio:'inherit'})
if(qa.error||qa.status!==0)throw Error(`Verlet QA failed: ${qa.error?.message??qa.status}`)
console.log(JSON.stringify({pass:true,bytes:bytes.length,sha256}))
