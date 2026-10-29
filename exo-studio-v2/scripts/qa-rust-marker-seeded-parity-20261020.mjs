import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHoodieTemplate } from '../src/data/templates.js'
import { buildFabricMarkers } from '../src/core/marker.js'
import { markerToSvg, markerToPdf } from '../src/core/markerArtifacts.js'
import { initializeRustMarkerKernel, rustMarkerKernelReady } from '../src/core/rustMarkerKernel.js'

const base = createHoodieTemplate()
base.markerSettings = { fabricWidthCm: 165, gapCm: 2, fabricWidthsCm: { main: 165, rib: 90 } }
const rotated = structuredClone(base)
rotated.pieces[0].grainAngleDeg = 34
rotated.pieces[0].marker = { allowCrossGrain: true }
rotated.pieces[0].cutQuantity = 3
rotated.pieces[1].cutQuantity = 2
const tooWide = structuredClone(base)
tooWide.markerSettings.fabricWidthsCm.rib = 35
const override = structuredClone(rotated)
override.markerSettings.fabricWidthsCm = { main: 145, rib: 100 }
const fixtures = [['base', base], ['rotated', rotated], ['too-wide', tooWide], ['width-override', override]]
const capture = (project) => {
  const markers = buildFabricMarkers(project, project.markerSettings.fabricWidthCm, project.markerSettings.gapCm)
  const artifacts = Object.fromEntries(Object.entries(markers).map(([fabricId, marker]) => [
    fabricId,
    {
      svg: markerToSvg(marker, { size: 'M', fabricName: fabricId, project }),
      pdf: Buffer.from(markerToPdf(marker, { size: 'M', project })).toString('hex'),
    },
  ]))
  return { markers, artifacts }
}
assert.equal(rustMarkerKernelReady(), false, 'Must capture genuine JS fallback before initializing WASM')
const snapshots = fixtures.map(([name, project]) => ({ name, project, original: structuredClone(project), before: capture(project) }))
assert(snapshots.find(item => item.name === 'rotated').before.markers.main.placements.some(p => p.rotationDeg !== 0), 'Rotation fixture must exercise a rotated outline')
assert(snapshots.find(item => item.name === 'too-wide').before.markers.rib.unplaced.some(p => p.reason === 'too-wide'), 'Too-wide fixture must produce an unplaced piece')
assert.equal(snapshots.find(item => item.name === 'width-override').before.markers.main.width, 145)
assert.equal(snapshots.find(item => item.name === 'width-override').before.markers.rib.width, 100)
const wasm = readFileSync(new URL('../public/wasm/exo_marker_kernel.wasm', import.meta.url))
const exported = new Set(WebAssembly.Module.exports(new WebAssembly.Module(wasm)).map(item => item.name))
for (const name of ['exo_marker_normalized_rotation','exo_marker_rotate_x','exo_marker_rotate_y']) {
  assert(exported.has(name), `Actual Rust marker geometry export missing: ${name}`)
}
assert.equal(await initializeRustMarkerKernel({ bytes: wasm }), true, 'Actual Rust WASM must load')
assert.equal(rustMarkerKernelReady(), true)
let markersChecked = 0
let artifactsChecked = 0
for (const { name, project, original, before } of snapshots) {
  const after = capture(project)
  assert.deepStrictEqual(after.markers, before.markers, name + ': complete marker JSON parity')
  for (const fabricId of Object.keys(before.artifacts)) {
    assert.equal(after.artifacts[fabricId].svg, before.artifacts[fabricId].svg, name + '/' + fabricId + ': physical SVG byte parity')
    assert.equal(after.artifacts[fabricId].pdf, before.artifacts[fabricId].pdf, name + '/' + fabricId + ': physical PDF byte parity')
    artifactsChecked += 2
  }
  assert.deepStrictEqual(project, original, name + ': immutable source project')
  markersChecked += Object.keys(before.markers).length
}
console.log(JSON.stringify({ pass: true, source: 'live V2', wasmLoaded: true, fixtures: fixtures.map(([name]) => name), markersChecked, artifactsChecked, parity: 'exact full JSON, SVG bytes, PDF bytes' }))
