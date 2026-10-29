import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {GARMENT_TEMPLATES} from '../src/data/templates.js'
import {buildFabricMarkers} from '../src/core/marker.js'
import {markerToPdf,markerToSvg} from '../src/core/markerArtifacts.js'
import {initializeRustMarkerKernel,rustMarkerKernelStatus} from '../src/core/rustMarkerKernel.js'
// Immutable pre-Rust writer blob, not HEAD (which may later include the port).
const source=execFileSync('git',['show','eb4893ca415a54ea949d61ab21295c6c8d74424d'],{encoding:'utf8'})
const projectUrl=pathToFileURL(resolve('src/core/project.js')).href
const original=await import('data:text/javascript;base64,'+Buffer.from(source.replace("from './project.js'",`from '${projectUrl}'`)).toString('base64'))
assert.equal(await initializeRustMarkerKernel({bytes:readFileSync('public/wasm/exo_marker_kernel.wasm')}),true)
assert.equal(rustMarkerKernelStatus().backend,'rust-wasm')
let templates=0,markers=0,checks=0
for(const entry of GARMENT_TEMPLATES){
  const project=entry.create()
  templates++
  for(const marker of Object.values(buildFabricMarkers(project))){
    if(!marker?.placements?.length)continue
    const options={size:'M',project}
    assert.deepEqual(Buffer.from(markerToPdf(marker,options)),Buffer.from(original.markerToPdf(marker,options)),`${entry.id} PDF`)
    assert.equal(markerToSvg(marker,options),original.markerToSvg(marker,options),`${entry.id} SVG`)
    markers++;checks+=2
  }
}
assert.equal(templates,10)
assert.ok(markers>=9,`Only ${markers} nonempty markers`)
console.log(JSON.stringify({pass:true,templates,markers,byteChecks:checks,backend:'rust-wasm'}))
