import {spawnSync} from 'node:child_process'
import {copyFileSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {join} from 'node:path'
import {homedir} from 'node:os'
const cargo=process.env.CARGO||join(homedir(),'.cargo/bin/cargo'),manifest='rust/exo_avatar_contact_parameters_kernel/Cargo.toml',target='rust/exo_avatar_contact_parameters_kernel/target',env={...process.env,CARGO_TARGET_DIR:target}
for(const args of [['test','--manifest-path',manifest,'--offline'],['build','--manifest-path',manifest,'--release','--target','wasm32-unknown-unknown','--offline']]){const r=spawnSync(cargo,args,{env,stdio:'inherit'});if(r.error||r.status!==0)throw Error(`Avatar contact Rust failed: ${r.error?.message||r.status}`)}
const dest='public/wasm/exo_avatar_contact_parameters_kernel.wasm';mkdirSync('public/wasm',{recursive:true});copyFileSync(join(target,'wasm32-unknown-unknown/release/exo_avatar_contact_parameters_kernel.wasm'),dest);const bytes=readFileSync(dest),sha256=createHash('sha256').update(bytes).digest('hex');writeFileSync('public/wasm/exo_avatar_contact_parameters_kernel.sha256',`${sha256}  exo_avatar_contact_parameters_kernel.wasm\n`)
const r=spawnSync(process.execPath,['scripts/qa-rust-avatar-contact-parameters-20261021.mjs'],{stdio:'inherit'});if(r.error||r.status!==0)throw Error(`Avatar contact parity failed ${r.error?.message||r.status}`)
console.log(JSON.stringify({pass:true,bytes:bytes.length,sha256}))
