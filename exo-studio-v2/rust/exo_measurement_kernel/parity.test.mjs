import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initializeRustMeasurementKernel, measureHorizontalSpans,
  rustMeasurementKernelStatus } from '../../src/core/rustMeasurementKernel.js'
import { measureProject, buildMeasurementSizeRun, measurementRunToCSV, buildTechPack } from '../../src/core/measurements.js'
import { createDefaultProject } from '../../src/data/defaultProject.js'
import { createZipHoodieTemplate } from '../../src/data/templates.js'

const polygon = [ { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 20 }, { x: 0, y: 20 } ]
const batches = [{ points: polygon, levels: [0, 5, 20, 25] },
  { points: [{ x: -2, y: 0 }, { x: 4, y: 0 }, { x: 1, y: 9 }], levels: [2, 5] }]
const baseline = measureHorizontalSpans(batches)
const projects = [createDefaultProject(), createZipHoodieTemplate()]
const custom = structuredClone(projects[0])
custom.customMeasurements = [{ id: 'custom-length', a: { x: 0, y: 0 }, b: { x: 3, y: 4 }, toleranceCm: 0.05 }]
projects.push(custom)
const expected = projects.map(project => ({ measure: measureProject(project),
  run: buildMeasurementSizeRun(project), csv: measurementRunToCSV(project),
  techpack: buildTechPack(project).sizeMeasurements }))
const bytes = readFileSync('public/wasm/exo_measurement_kernel.wasm')
assert.equal(await initializeRustMeasurementKernel({ bytes }), true, rustMeasurementKernelStatus().error)
assert.equal(rustMeasurementKernelStatus().backend, 'rust-wasm')
assert.deepEqual(measureHorizontalSpans(batches), baseline)
let fallbackComparisons = batches.reduce((n, batch) => n + batch.levels.length, 0)
for (let index = 0; index < projects.length; index++) {
  const project = projects[index], before = structuredClone(project)
  assert.deepEqual(measureProject(project), expected[index].measure)
  assert.deepEqual(buildMeasurementSizeRun(project), expected[index].run)
  assert.equal(measurementRunToCSV(project), expected[index].csv)
  assert.deepEqual(buildTechPack(project).sizeMeasurements, expected[index].techpack)
  assert.deepEqual(project, before)
}
let samples = 0
for (let index = 0; index < 1000; index++) {
  const width = 1 + ((index * 239) % 997) / 17
  const height = 1 + ((index * 123) % 777) / 13
  const offset = ((index * 157) % 241) / 99
  const test = [{ points: [ { x: 0, y: 0 }, { x: width, y: 0 },
    { x: width + offset, y: height }, { x: 0, y: height } ],
    levels: [height * 0.2, height * 0.3, height * 0.7, height * 0.8] }]
  for (const [i, span] of measureHorizontalSpans(test)[0].entries()) {
    const y = test[0].levels[i]
    const manual = width + offset * y / height
    if (y >= 0.2 && height - y >= 0.2)
      assert.ok(Math.abs(span - manual) < 1e-10, `span ${index}:${i} ${span} != ${manual}`)
  }
  samples++
}
// Fallback is the pre-load algorithm, so load it from a cache-busted module
// for numeric comparison against the compiled runtime without toggling globals.
const fallbackModule = await import(`../../src/core/rustMeasurementKernel.js?fallback=${Date.now()}`)
for (let index = 0; index < 500; index++) {
  const width = 10 + ((index * 37) % 200) / 17
  const height = 10 + ((index * 19) % 100) / 13
  const shape = [{ x: -5, y: 0 }, { x: width, y: 0 },
    { x: width + index / 99, y: height }, { x: -5 - index / 211, y: height }]
  const levels = [0, .05, .199999, .2, height / 2, height - .199999, height]
  const batch = [{ points: shape, levels }]
  const plain = fallbackModule.measureHorizontalSpans(batch)[0]
  const wasm = measureHorizontalSpans(batch)[0]
  plain.forEach((expected, i) => {
    const actual = wasm[i]
    assert.ok(Math.abs(actual - expected) < 1e-10, `differential ${index}:${i}, ${actual} != ${expected}`)
    fallbackComparisons++
  })
}
console.log(JSON.stringify({ pass: true, wasm: true, projects: projects.length,
  numericCases: samples, fallbackComparisons }))
