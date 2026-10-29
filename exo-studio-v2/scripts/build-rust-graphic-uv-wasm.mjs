/** Build dependency-free Rust graphic layout into EXO's native WebAssembly asset.
 * Install Rust with wasm32-unknown-unknown (rustup target add wasm32-unknown-unknown).
 * Keep integrations/clothcraft/rust/graphic_uv_kernel.rs byte-for-byte aligned
 * with ClothCraft fork src/garment/graphic_uv_kernel.rs (see parity QA). */
import {spawnSync} from 'node:child_process'
import {existsSync,mkdirSync, statSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {homedir} from 'node:os'
import {fileURLToPath} from 'node:url'
const root=join(dirname(fileURLToPath(import.meta.url)),'..')
const source=join(root,'integrations/clothcraft/rust/graphic_uv_kernel.rs')
const target=join(root,'public/graphic-presets/exo-graphic-uv.wasm')
mkdirSync(dirname(target),{recursive:true})
const args=['--edition=2024','--crate-type=cdylib','--target=wasm32-unknown-unknown','-C','opt-level=z','-C','panic=abort','-C','strip=symbols',source,'-o',target]
const rustc=process.env.EXO_RUSTC||(
  existsSync(join(homedir(),'.cargo/bin/rustc'))?join(homedir(),'.cargo/bin/rustc'):'rustc')
const result=spawnSync(rustc,args,{stdio:'inherit'})
if(result.error || result.status!==0)throw new Error(`Rust WebAssembly compilation failed: ${result.error?.message||result.status}`)
const size=statSync(target).size
if(size<200 || size>64000)throw new Error(`Unexpected Rust graphic WASM size: ${size}`)
console.log(`Rust EXO Graphic UV WASM ready (${size} bytes): ${target}`)
