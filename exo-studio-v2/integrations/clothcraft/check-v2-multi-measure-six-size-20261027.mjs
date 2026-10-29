// Disposable real-Rust acceptance: two direct measurements, two detached
// material panels, four dependent points and one complete XS-XXL native commit.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createWorkspace } from './workspace.mjs'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'exo-two-measure-six-size-'))
const workspace = createWorkspace(root)
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const offsets = { XS: -0.016, S: -0.008, M: 0, L: 0.008, XL: 0.016, XXL: 0.024 }
let current
const send = async command => {
  const response = await workspace.request({ revision: current?.revision, ...command })
  assert.equal(response.ok, true, `${command.op}: ${response.error ?? 'rejected'}`)
  if (response.data?.template) current = response.data
  return response.data
}
const fail = async command => {
  const before = structuredClone(current)
  const response = await workspace.request({ revision: current.revision, ...command })
  assert.equal(response.ok, false, `Unsafe ${command.op} was accepted`)
  await send({op: 'snapshot'})
  assert.equal(current.revision, before.revision)
  assert.deepEqual(current.template, before.template)
  assert.deepEqual(current.nativePointBindings, before.nativePointBindings)
}
const point = (snapshot, panelId, index) => snapshot.template.panels.find(panel => panel.id === panelId).polygon.points[index]
const close = (actual, expected) => assert(Math.abs(actual - expected) < 1e-8, `Expected ${expected}, got ${actual}`)

try {
  await send({ op: 'open', preset: 'tshirt' })
  for (const seam of [...current.template.seams]) await send({ op: 'edit', command: { kind: 'RemoveSeam', seam: seam.id } })
  const existing = new Set(current.template.panels.map(panel => panel.id))
  const fabric = current.template.fabrics[0].id
  for (let i = 0; i < 2; i++) await send({ op: 'edit', command: { kind: 'Polygon', fabric, points: [[0, 0], [.4, 0], [.4, .32], [0, .32]] } })
  const ids = current.template.panels.filter(panel => !existing.has(panel.id)).map(panel => panel.id)
  assert.equal(ids.length, 2)
  const bindings = ids.flatMap((panelId, i) => [
    { id: `width_${i}`, panelId, pointIndex: 1, mode: 'polar', a: 0, b: 0, angleDeg: 0, distanceFormula: 'width', dependsOn: [] },
    { id: `height_${i}`, panelId, pointIndex: 2, mode: 'polar', a: 1, b: 0, angleDeg: 90, distanceFormula: 'height', dependsOn: [`width_${i}`] },
  ])
  await send({ op: 'bindings-store', nativeBindings: { measurements: { width: { valueMm: 400 }, height: { valueMm: 320 } }, bindings } })
  assert.equal(current.nativePointBindings.active, true)
  const base = structuredClone(current.template)
  const catalog = { schemaVersion: 1, sizes, baseSize: 'M', baseTemplate: base,
    gradedTemplates: sizes.map(size => {
      const template = structuredClone(base)
      if (size !== 'M') for (const panel of template.panels) if (ids.includes(panel.id)) {
        panel.polygon.points[1][0] += offsets[size]
        panel.polygon.points[2][0] += offsets[size]
      }
      return template
    }), pomSpecs: [] }
  await send({ op: 'grade-run-commit', gradeRun: catalog })
  assert.equal(current.gradeRunPersisted, true)
  const original = structuredClone(current)
  const changes = { width: 380, height: 300 }
  await fail({op: 'bindings-grade-regenerate-preview', overrides: { width: 380, bogus: 300 }})
  const preview = await send({ op: 'bindings-grade-regenerate-preview', overrides: changes })
  assert.equal(preview.format, 'exo-native-reactive-size-run.v1')
  assert.equal(preview.sourceRevision, original.revision)
  assert.equal(preview.changedPanels, 2)
  assert.equal(preview.changedBindings, 4)
  assert.deepEqual(preview.measurementOverrides, changes)
  assert.deepEqual(preview.bySize.map(row => row.size), sizes)
  for (const row of preview.bySize) {
    assert.equal(row.changes.length, 4)
    assert(row.changes.every(change => change.beforeMm.length === 2 && change.afterMm.length === 2))
  }
  assert.equal(current.revision, original.revision)
  assert.deepEqual(current.template, original.template)

  const committed = await send({ op: 'bindings-grade-regenerate', overrides: changes })
  assert.equal(current.revision, original.revision + 1)
  assert.deepEqual(committed.regenerationEvidence, preview)
  assert.equal(current.nativePointBindings.measurements.width.valueMm, 380)
  assert.equal(current.nativePointBindings.measurements.height.valueMm, 300)
  for (const id of ids) {
    close(point(current, id, 1)[0], .38)
    close(point(current, id, 2)[0], .38)
    close(point(current, id, 2)[1], .3)
  }
  const saved = await send({ op: 'save' })
  for (const [i, size] of sizes.entries()) for (const id of ids) {
    const panel = saved.project.grade_run.gradedTemplates[i].panels.find(p => p.id === id)
    close(panel.polygon.points[1][0] - point(current, id, 1)[0], offsets[size])
    close(panel.polygon.points[2][0] - point(current, id, 2)[0], offsets[size])
    close(panel.polygon.points[2][1], .3)
  }
  await send({ op: 'undo' })
  assert.deepEqual(current.template, original.template)
  await send({ op: 'redo' })
  assert.equal(current.nativePointBindings.measurements.width.valueMm, 380)
  assert.equal(current.nativePointBindings.measurements.height.valueMm, 300)
  await send({ op: 'open', project: saved.project })
  assert.equal(current.gradeRunPersisted, true)
  assert.equal(current.nativePointBindings.active, true)
  for (const id of ids) close(point(current, id, 2)[1], .3)
  console.log(JSON.stringify({ pass: true, native: true, panels: ids.length, changedBindings: 4, sizes, oneUndoStep: true, factoryApproved: false }))
} finally {
  workspace.close()
  fs.rmSync(root, { recursive: true, force: true })
}
