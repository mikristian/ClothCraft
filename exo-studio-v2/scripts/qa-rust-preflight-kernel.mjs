import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { inspectProduction } from '../src/core/productionPreflight.js'
import { inspectProduction as legacy } from './fixtures/productionPreflightLegacy.mjs'
import { initializeRustPreflightKernel, rustPreflightKernelReady } from '../src/core/rustPreflightKernel.js'

const fixtures = []
const values = [undefined, null, '', '2', 0, -1, 1.5, 99, 100, NaN, Infinity, -Infinity]
for (let i = 0; i < 1000; i++) {
  const width = 1 + (i * 17 % 180)
  const piece = (id, w) => ({ id, name: id, points: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: 10 }, { x: 0, y: 10 }] })
  const project = {
    pieces: [piece('a', width), piece('b', 10)], fabrics: { main: {} },
    grading: { baseSize: 'M', sizes: ['M'] },
    seams: [{ id: 's', a: { pieceId: 'a', edgeIndex: 0 }, b: { pieceId: 'b', edgeIndex: 0 } }],
    markerSettings: { fabricWidthCm: 150, gapCm: 1.5 },
  }
  const p = project.pieces[0], value = values[Math.floor(i / 20) % values.length]
  switch (i % 20) {
    case 0: p.cutQuantity = value; break
    case 1: p.seamAllowance = value; break
    case 2: p.points[0].x = value; break
    case 3: p.points = []; break
    case 4: p.points[1] = { x: 0.049, y: 0 }; break
    case 5: p.points = [{ x: 0, y: 0 }, { x: 0.05, y: 0 }, { x: 0, y: 0.05 }]; break
    case 6: p.points = [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 }]; break
    case 7: p.notches = [{ edgeIndex: value, t: value }]; break
    case 8: project.seams[0].a.edgeIndex = value; break
    case 9: p.fabricId = 'absent'; break
    case 10: p.id = 'b'; break
    case 11: project.grading.sizes = ['M', 'M']; break
    case 12: project.pieces = []; break
    case 13: p.curves = { 0: { cx: width / 2, cy: 8 } }; break
    case 14: project.markerSettings.fabricWidthCm = value; break
    case 15: project.seams[0].a.pieceId = 'absent'; break
    case 16: p.notches = [{ edgeIndex: '0', t: 0 }, { edgeIndex: 3, t: 1.001 }]; break
    case 17: p.points[1].x = 0.05; break
    case 18: p.points[1].x = 10; p.points[2].x = 10; break
  }
  fixtures.push({ project, options: { allSizes: i % 2 === 0 } })
}
const expected = fixtures.map(({ project, options }) => legacy(project, options))
for (const [i, { project, options }] of fixtures.entries()) assert.deepStrictEqual(inspectProduction(project, options), expected[i], `fallback fixture ${i}`)
assert.equal(await initializeRustPreflightKernel({ bytes: readFileSync('public/wasm/exo_preflight_kernel.wasm') }), true)
assert.equal(rustPreflightKernelReady(), true)
for (const [i, { project, options }] of fixtures.entries()) assert.deepStrictEqual(inspectProduction(project, options), expected[i], `Rust fixture ${i}`)
console.log('PASS: 1000 full reports match frozen JS oracle in fallback and Rust/WASM paths')
