import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { projectToBomXml } from '../src/core/bomXml.js'
import { initializeRustBomKernel, rustBomKernelReady, rustBomXml } from '../src/core/rustBomKernel.js'
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/bom-xml.json', import.meta.url)))
assert.equal(await initializeRustBomKernel({ bytes: new Uint8Array([0]) }), false)
assert.equal(rustBomKernelReady(), false)
for (const {project, xml} of fixtures) assert.equal(projectToBomXml(project), xml)
const malformed = {name:'\ud800', pieces:[]}
const fallback = projectToBomXml(malformed)
assert.equal(await initializeRustBomKernel({ bytes: readFileSync(new URL('../public/wasm/exo_bom_kernel.wasm', import.meta.url)) }), true)
assert.equal(rustBomKernelReady(), true)
assert.equal(rustBomXml({name:'GarmentStudioBOM',attributes:{},children:[]}), '<?xml version="1.0" encoding="UTF-8"?>\n<GarmentStudioBOM></GarmentStudioBOM>\n')
for (let i=0;i<20;i++) for (const {project, xml} of fixtures) {
  const before = structuredClone(project)
  assert.equal(projectToBomXml(project), xml)
  assert.deepEqual(project, before)
}
assert.equal(projectToBomXml(malformed), fallback)
console.log('BOM XML: golden byte parity, Rust WASM dispatch, repeated allocation, invalid WASM and UTF-16 fallback PASS')
