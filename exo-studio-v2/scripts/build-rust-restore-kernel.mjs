import {spawnSync} from 'node:child_process'
import {copyFileSync,mkdirSync} from 'node:fs'
const cargo=process.env.CARGO||`${process.env.HOME}/.cargo/bin/cargo`
for(const args of [['test','--manifest-path','rust/exo_restore_kernel/Cargo.toml','--offline'],['build','--manifest-path','rust/exo_restore_kernel/Cargo.toml','--target','wasm32-unknown-unknown','--release','--offline']]){
 const r=spawnSync(cargo,args,{stdio:'inherit'});if(r.error||r.status!==0)throw Error(`Cargo failed: ${r.error?.message||r.status}`)
}
mkdirSync('public/wasm',{recursive:true})
copyFileSync('rust/exo_restore_kernel/target/wasm32-unknown-unknown/release/exo_restore_kernel.wasm','public/wasm/exo_restore_kernel.wasm')
console.log('PASS exo_restore_kernel build')
