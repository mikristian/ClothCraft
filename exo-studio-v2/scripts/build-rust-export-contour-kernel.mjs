import {spawnSync} from 'node:child_process'
import {mkdirSync,copyFileSync} from 'node:fs'
const cargo=process.env.CARGO||`${process.env.HOME}/.cargo/bin/cargo`
for(const args of [['test','--manifest-path','rust/exo_export_contour_kernel/Cargo.toml','--offline'],['build','--manifest-path','rust/exo_export_contour_kernel/Cargo.toml','--target','wasm32-unknown-unknown','--release','--offline']]){
 const r=spawnSync(cargo,args,{stdio:'inherit'});if(r.error||r.status!==0)throw Error(`Cargo ${args.join(' ')} failed`)
}
mkdirSync('public/wasm',{recursive:true});copyFileSync('rust/exo_export_contour_kernel/target/wasm32-unknown-unknown/release/exo_export_contour_kernel.wasm','public/wasm/exo_export_contour_kernel.wasm')
console.log('PASS export contour WASM build')
