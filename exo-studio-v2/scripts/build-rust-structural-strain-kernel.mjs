import {spawnSync} from 'node:child_process'
import {copyFileSync,mkdirSync} from 'node:fs'
import {homedir} from 'node:os'
import {join} from 'node:path'
const target='rust/exo_structural_strain_kernel/target'
for(const args of [['test','--offline'],['build','--offline','--release','--target','wasm32-unknown-unknown']]) {
  const result=spawnSync(process.env.CARGO||join(homedir(),'.cargo/bin/cargo'),[...args,'--manifest-path','rust/exo_structural_strain_kernel/Cargo.toml'],{stdio:'inherit',env:{...process.env,CARGO_TARGET_DIR:target}})
  if(result.error)throw result.error
  if(result.status!==0)process.exit(result.status??1)
}
mkdirSync('public/wasm',{recursive:true})
copyFileSync(`${target}/wasm32-unknown-unknown/release/exo_structural_strain_kernel.wasm`,'public/wasm/exo_structural_strain_kernel.wasm')
