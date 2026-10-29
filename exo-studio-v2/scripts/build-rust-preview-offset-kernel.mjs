import {spawnSync} from 'node:child_process'
import {mkdirSync,copyFileSync} from 'node:fs'
const cargo=process.env.CARGO||`${process.env.HOME}/.cargo/bin/cargo`
for(const args of [['test','--manifest-path','rust/exo_preview_offset_kernel/Cargo.toml','--offline'],['build','--manifest-path','rust/exo_preview_offset_kernel/Cargo.toml','--target','wasm32-unknown-unknown','--release','--offline']]){
 const result=spawnSync(cargo,args,{stdio:'inherit'});if(result.error||result.status!==0)throw Error(`Cargo ${args.join(' ')} failed`)
}
mkdirSync('public/wasm',{recursive:true})
copyFileSync('rust/exo_preview_offset_kernel/target/wasm32-unknown-unknown/release/exo_preview_offset_kernel.wasm','public/wasm/exo_preview_offset_kernel.wasm')
console.log('PASS preview offset WASM build')
