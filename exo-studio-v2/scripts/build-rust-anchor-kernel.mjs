import {spawnSync} from 'node:child_process'
import {copyFileSync,mkdirSync} from 'node:fs'
import {homedir} from 'node:os'
import {join} from 'node:path'
const target='rust/exo_anchor_kernel/target'
for(const args of [['test','--offline'],['build','--offline','--release','--target','wasm32-unknown-unknown']]){
  const r=spawnSync(process.env.CARGO||join(homedir(),'.cargo/bin/cargo'),[...args,'--manifest-path','rust/exo_anchor_kernel/Cargo.toml'],{stdio:'inherit',env:{...process.env,CARGO_TARGET_DIR:target}})
  if(r.error)throw r.error
  if(r.status!==0)process.exit(r.status??1)
}
mkdirSync('public/wasm',{recursive:true})
copyFileSync(`${target}/wasm32-unknown-unknown/release/exo_anchor_kernel.wasm`,'public/wasm/exo_anchor_kernel.wasm')
