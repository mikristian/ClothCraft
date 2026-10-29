import {spawnSync} from 'node:child_process'
const result=spawnSync(process.env.CARGO||`${process.env.HOME}/.cargo/bin/cargo`,['build','--manifest-path','rust/exo_health_kernel/Cargo.toml','--release','--offline'],{stdio:'inherit'})
if(result.error||result.status!==0)throw Error(`Health Rust build failed: ${result.error?.message||result.status}`)
console.log(JSON.stringify({pass:true,binary:'rust/exo_health_kernel/target/release/exo-health-kernel'}))
