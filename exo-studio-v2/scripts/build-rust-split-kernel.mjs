import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const cargo=process.env.CARGO ?? join(homedir(),'.cargo/bin/cargo')
const manifest='rust/exo_split_kernel/Cargo.toml'
const targetDir=process.env.EXO_SPLIT_TARGET_DIR ?? 'rust/exo_split_kernel/target'
const env={...process.env,CARGO_TARGET_DIR:targetDir}

for(const args of [
  ['test','--manifest-path',manifest,'--offline'],
  ['build','--manifest-path',manifest,'--target','wasm32-unknown-unknown','--release','--offline'],
]) {
  const result=spawnSync(cargo,args,{env,stdio:'inherit'})
  if(result.error)throw result.error
  if(result.status!==0)throw new Error(`Cargo ${args.join(' ')} exited ${result.status}`)
}

const source=join(targetDir,'wasm32-unknown-unknown/release/exo_split_kernel.wasm')
const output='public/wasm/exo_split_kernel.wasm'
mkdirSync('public/wasm',{recursive:true})
copyFileSync(source,output)
const sha256=createHash('sha256').update(readFileSync(output)).digest('hex')
writeFileSync('public/wasm/exo_split_kernel.sha256',`${sha256}  exo_split_kernel.wasm\n`)
console.log(JSON.stringify({pass:true,wasm:output,bytes:statSync(output).size,sha256,abi:1}))
