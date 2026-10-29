import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initializeRustFabricCostKernel, rustFabricCostKernelReady,
  rustFabricCostKernelStatus, calculateFabricCosts } from '../../src/core/rustFabricCostKernel.js'
import { buildFabricCostRun, fabricCostRunToCsv } from '../../src/core/productionCost.js'
import { createDefaultProject } from '../../src/data/defaultProject.js'
import { createZipHoodieTemplate } from '../../src/data/templates.js'

const cases = [
  { lengthMeters: 1.23456, price: 19.75, requested: 2, placed: 2, unused: 0 },
  { lengthMeters: 1.00001, price: 0, requested: 1, placed: 1, unused: 0 },
  { lengthMeters: 10, price: null, requested: 1, placed: 1, unused: 0 },
  { lengthMeters: 0.5, price: 12, requested: 2, placed: 1, unused: 1 },
  { lengthMeters: 3.123456, price: 12.87654, requested: 1, placed: 1, unused: 0 },
]
const groups = [{ start: 0, count: 2 }, { start: 2, count: 2 }, { start: 4, count: 1 }]
const fallback = calculateFabricCosts(cases, groups)
assert.equal(rustFabricCostKernelStatus().backend, 'javascript-fallback')
const bytes = readFileSync('public/wasm/exo_fabric_cost_kernel.wasm')
assert.equal(await initializeRustFabricCostKernel({ bytes }), true, rustFabricCostKernelStatus().error)
assert.equal(rustFabricCostKernelReady(), true)
assert.equal(rustFabricCostKernelStatus().backend, 'rust-wasm')
assert.deepEqual(calculateFabricCosts(cases, groups), fallback)

const projects = [createDefaultProject(), createZipHoodieTemplate()]
const expectedReports = projects.map(project => {
  // Baseline report logic is expressed independently from the compiled kernel.
  const report = buildFabricCostRun(project)
  return report.totals.map(({ size, currency, ready, materialCost }) =>
    ({ size, currency, ready, materialCost }))
})
for (const base of [...projects]) {
  const priced = structuredClone(base)
  for (const fabric of Object.values(priced.fabrics)) fabric.pricePerMeter = 19.75
  projects.push(priced)
}
const incomplete = structuredClone(projects[3])
incomplete.markerSettings.fabricWidthsCm = { ...incomplete.markerSettings.fabricWidthsCm, rib: 90 }
projects.push(incomplete)
for (const project of projects) {
  const source = structuredClone(project)
  const report = buildFabricCostRun(project)
  assert.deepEqual(project, source)
  assert.equal(report.factoryCertified, false)
  if (projects.indexOf(project) < expectedReports.length)
    assert.deepEqual(report.totals, expectedReports[projects.indexOf(project)])
  assert.ok(report.rows.length > 0)
  assert.equal(report.totals.length, project.grading.sizes.length)
  assert.ok(fabricCostRunToCsv(report).startsWith('"Size"'))
  const rowInputs = report.rows.map(row => ({ lengthMeters: row.lengthMeters,
    price: row.pricePerMeter, requested: row.cutPiecesRequested,
    placed: row.cutPiecesPlaced, unused: row.complete ? 0 : 1 }))
  const sizeGroups = report.totals.map(total => {
    const start = report.rows.findIndex(row => row.size === total.size)
    return { start, count: report.rows.filter(row => row.size === total.size).length }
  })
  const expected = calculateFabricCosts(rowInputs, sizeGroups)
  expected.calculated.forEach((cost, index) => {
    assert.equal(cost.status, report.rows[index].status)
    assert.equal(cost.extendedCost, report.rows[index].extendedCost)
  })
  expected.totals.forEach((total, index) => {
    assert.deepEqual(total, { ready: report.totals[index].ready,
      materialCost: report.totals[index].materialCost })
  })
}

let differentialCases = 0
for (let n = 0; n < 800; n++) {
  const lengthMeters = ((n * 7919) % 50001) / 999
  const price = ((n * 673) % 29999) / 970
  const rows = [
    { lengthMeters, price, requested: 1, placed: 1, unused: 0 },
    { lengthMeters: lengthMeters * 0.39, price: n % 7 ? price / 3 : null,
      requested: 2, placed: n % 11 ? 2 : 1, unused: n % 11 ? 0 : 1 },
  ]
  const groups = [{ start: 0, count: 2 }]
  const js = {
    calculated: rows.map(row => {
      const complete = row.unused === 0 && row.placed === row.requested
      const status = !complete ? 'INCOMPLETE_MARKER' : row.price === null ? 'PRICE_NOT_SET' : 'ESTIMATED'
      return { complete, status, extendedCost: status === 'ESTIMATED' ?
        Number((row.lengthMeters * row.price).toFixed(4)) : null }
    }),
  }
  const ready = js.calculated.every(item => item.status === 'ESTIMATED')
  js.totals = [{ ready, materialCost: ready ?
    Number(js.calculated.reduce((sum, row) => sum + row.extendedCost, 0).toFixed(4)) : null }]
  assert.deepEqual(calculateFabricCosts(rows, groups), js, `cost differential ${n}`)
  differentialCases++
}
console.log(JSON.stringify({ pass: true, wasmLoaded: true, reportProjects: projects.length,
  edgeRows: cases.length, differentialCases }))
