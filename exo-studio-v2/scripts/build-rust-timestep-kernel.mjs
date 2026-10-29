import {spawnSync} from 'node:child_process'
import {copyFileSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {join} from 'node:path'
import {homedir} from 'node:os'
const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo'),manifest='rust/exo_timestep_kernel/Cargo.toml',target=process.env.EXO_TIMESTEP_TARGET||'rust/exo_timestep_kernel/target',env={...process.env,CARGO_TARGET_DIR:target}
for(const args of [['test','--manifest-path',manifest,'--offline'],['build','--manifest-path',manifest,'--release','--target','wasm32-unknown-unknown','--offline']]){const r=spawnSync(cargo,args,{env,stdio:'inherit'});if(r.error||r.status!==0)throw Error(`Timestep Cargo failed: ${r.error?.message||r.status}`)}
const dest='public/wasm/exo_timestep_kernel.wasm';mkdirSync('public/wasm',{recursive:true});copyFileSync(join(target,'wasm32-unknown-unknown/release/exo_timestep_kernel.wasm'),dest);const bytes=readFileSync(dest),sha256=createHash('sha256').update(bytes).digest('hex');writeFileSync('public/wasm/exo_timestep_kernel.sha256',`${sha256}  exo_timestep_kernel.wasm\n`)
const qa=spawnSync(process.execPath,['scripts/qa-rust-timestep-20261021.mjs'],{stdio:'inherit'});if(qa.error||qa.status!==0)throw Error(`Timestep parity failed: ${qa.error?.message||qa.status}`)
console.log(JSON.stringify({pass:true,bytes:bytes.length,sha256}))
