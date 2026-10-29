#!/usr/bin/env node
/**
 * Read-only release evidence: compare Rust artifacts currently built in the
 * EXO source workspace against the user's actual installed V2 macOS bundle.
 * This does not build, copy, sign, open, or stop the app.
 *
 *   node scripts/qa-rust-v2-shipping-audit-20261018.mjs
 *   node scripts/qa-rust-v2-shipping-audit-20261018.mjs --require-shipped
 */
import {existsSync, readFileSync, statSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {homedir} from 'node:os'
import {resolve, join} from 'node:path'

const root = resolve(import.meta.dirname, '..')
const app = process.env.EXO_DESKTOP_DEST ??
  join(homedir(), 'Applications', 'EXO ClothCraft Studio V2.app')
const resourceRoot = join(app, 'Contents', 'Resources')
const specs = [
  {
    id:'native-rust-session',
    source:'research/oss/clothcraft/target/debug/exo-session',
    installed:'research/oss/clothcraft/target/debug/exo-session',
  },
  {
    id:'wasm-fabric',
    source:'public/wasm/exo_fabric_kernel.wasm',
    installed:'web/wasm/exo_fabric_kernel.wasm',
    exports:['exo_fabric_kernel_abi_version'],
  },
  {
    id:'wasm-geometry',
    source:'public/wasm/exo_geometry_kernel.wasm',
    installed:'web/wasm/exo_geometry_kernel.wasm',
    exports:['exo_geometry_abi_version','exo_grid_coordinate',
      'exo_draft_axis_x','exo_draft_axis_y','exo_topology_kind'],
  },
  {
    id:'wasm-grading',
    source:'public/wasm/exo_grading_kernel.wasm',
    installed:'web/wasm/exo_grading_kernel.wasm',
    exports:['exo_grading_abi_version','exo_grade_point_x','exo_grade_point_y'],
  },
  {
    id:'wasm-sewing',
    source:'public/wasm/exo_sewing_kernel.wasm',
    installed:'web/wasm/exo_sewing_kernel.wasm',
    exports:['exo_sewing_abi_version','exo_sewing_signed_difference_cm',
      'exo_sewing_difference_percent','exo_sewing_warning'],
  },
  {
    id:'wasm-pom-ui',
    source:'public/wasm/exo_ui_kernel.wasm',
    installed:'web/wasm/exo_ui_kernel.wasm',
    exports:['exo_pom_abi_version','exo_pom_label_x','exo_pom_label_y'],
  },
  {
    id:'rust-metadata-validator',
    source:'integrations/clothcraft/rust-service/target/debug/exo-metadata-validation',
    installed:'integrations/clothcraft/rust-service/target/debug/exo-metadata-validation',
  },
  {
    id:'rust-static-web-host',
    source:'integrations/clothcraft/rust-static-host/target/debug/exo-rust-static-host',
    installed:'integrations/clothcraft/rust-static-host/target/debug/exo-rust-static-host',
  },
]

function inspect(file, expectedExports) {
  if (!existsSync(file)) return {exists:false}
  const stat=statSync(file)
  if (!stat.isFile() || stat.size===0) return {exists:false, reason:'empty-or-not-file'}
  const bytes=readFileSync(file)
  const result={
    exists:true,bytes:stat.size,
    sha256:createHash('sha256').update(bytes).digest('hex'),
  }
  if (expectedExports) {
    try {
      const found=new Set(WebAssembly.Module.exports(new WebAssembly.Module(bytes))
        .filter(entry=>entry.kind==='function').map(entry=>entry.name))
      result.missingExports=expectedExports.filter(name=>!found.has(name))
    } catch (error) {
      result.missingExports=expectedExports
      result.wasmError=String(error?.message??error)
    }
  }
  return result
}

const artifacts=specs.map(spec=>{
  const source=inspect(join(root,spec.source),spec.exports)
  const installed=inspect(join(resourceRoot,spec.installed),spec.exports)
  const identical=source.exists && installed.exists && source.sha256===installed.sha256
  let status='current'
  if(!source.exists)status='source-build-missing'
  else if(!installed.exists)status='installed-missing'
  else if(installed.missingExports?.length)status='installed-wasm-abi-incomplete'
  else if(!identical)status='installed-differs-from-source'
  else if(source.missingExports?.length)status='source-wasm-abi-incomplete'
  return {id:spec.id,status,source,installed}
})
const releaseReady=artifacts.every(item=>item.status==='current')
const report={
  schema:'exo.rust-v2-release-audit.v1',
  installedApp:app,
  releaseReady,
  interpretation:releaseReady
    ? 'Compiled artifact identities match; app runtime behavior still requires native smoke tests.'
    : 'Current source Rust artifacts have not all shipped. Run packaging and native smoke gates before claiming conversion is live.',
  artifacts,
}
console.log(JSON.stringify(report,null,2))
if(process.argv.includes('--require-shipped')&&!releaseReady)process.exitCode=1
