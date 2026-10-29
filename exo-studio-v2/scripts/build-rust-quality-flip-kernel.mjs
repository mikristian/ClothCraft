import {spawnSync} from 'node:child_process'
import {copyFileSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {homedir} from 'node:os'
import {join} from 'node:path'
const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo'),manifest='rust/exo_quality_flip_kernel/Cargo.toml',target=process.env.EXO_QUALITY_FLIP_TARGET||'rust/exo_quality_flip_kernel/target',env={...process.env,CARGO_TARGET_DIR:target}
for(const args of [['test','--manifest-path',manifest,'--offline'],['build','--manifest-path',manifest,'--release','--target','wasm32-unknown-unknown','--offline']]){const r=spawnSync(cargo,args,{env,stdio:'inherit'});if(r.error||r.status!==0)throw Error(`Quality flip Cargo failed: ${r.error?.message||r.status}`)}
const destination='public/wasm/exo_quality_flip_kernel.wasm';mkdirSync('public/wasm',{recursive:true});copyFileSync(join(target,'wasm32-unknown-unknown/release/exo_quality_flip_kernel.wasm'),destination);const bytes=readFileSync(destination),sha256=createHash('sha256').update(bytes).digest('hex');writeFileSync('public/wasm/exo_quality_flip_kernel.sha256',`${sha256}  exo_quality_flip_kernel.wasm\n`)
const qa=spawnSync(process.execPath,['scripts/qa-rust-quality-flip-20261021.mjs'],{env,stdio:'inherit'});if(qa.error||qa.status!==0)throw Error(`Quality flip parity failed: ${qa.error?.message||qa.status}`)
console.log(JSON.stringify({pass:true,bytes:bytes.length,sha256}))
