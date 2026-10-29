// Disposable compiled-Rust acceptance of a direct measurement -> dependent
// 2D anchor recompute. No installed project or JS-planned dependent edits.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createWorkspace } from './workspace.mjs'

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'exo-native-measure-recompute-'))
const workspace = createWorkspace(folder)
let snapshot
const request = async payload => {
  const result = await workspace.request({ revision: snapshot?.revision, ...payload })
  assert.equal(result.ok, true, `${payload.op}: ${result.error}`)
  if (result.data?.template) snapshot = result.data
  return result.data
}
const point = (panelId, index) => snapshot.template.panels.find(p => p.id === panelId).polygon.points[index]
const measure = () => snapshot.nativePointBindings.measurements.hemWidth.valueMm
const geometry = panelId => ({
  revision: snapshot.revision,
  template: structuredClone(snapshot.template),
  bindings: structuredClone(snapshot.nativePointBindings),
  point2: [...point(panelId, 2)],
  point3: [...point(panelId, 3)],
})
const width = panelId => point(panelId, 2)[0] - point(panelId, 3)[0]
const rejected = async (panelId, payload, expectedMessage) => {
  const before = geometry(panelId)
  const result = await workspace.request({ revision: snapshot.revision, ...payload })
  assert.equal(result.ok, false, `Forged ${payload.op} unexpectedly succeeded`)
  if (expectedMessage) assert.match(result.error ?? '', expectedMessage)
  await request({ op: 'snapshot' })
  assert.deepEqual(geometry(panelId), before, 'Rejected operation must preserve revision, pattern and persisted graph')
}
const set = (expectedValueMm, valueMm, extra = {}) => request({
  op: 'bindings-measurement-recompute', measurement: 'hemWidth',
  expectedValueMm, valueMm, ...extra,
})

try {
  await request({ op: 'open', preset: 'tshirt' })
  const existing = new Set(snapshot.template.panels.map(p => p.id))
  await request({ op: 'edit', command: {
    kind: 'Polygon', fabric: snapshot.template.fabrics[0].id,
    points: [[0, 0], [.4, 0], [.4, .4], [0, .4]],
  } })
  const [panel] = snapshot.template.panels.filter(p => !existing.has(p.id))
  assert(panel, 'Detached test rectangle must exist')
  const panelId = panel.id
  const bindings = {
    measurements: { hemWidth: { valueMm: 400 } },
    bindings: [{ id: 'measure_hem', panelId, pointIndex: 3,
      mode: 'polar', a: 2, b: 1, angleDeg: 180,
      distanceFormula: 'hemWidth', dependsOn: [] }],
  }
  await request({ op: 'bindings-store', nativeBindings: bindings })
  assert.equal(snapshot.nativePointBindings.active, true)
  assert.equal(measure(), 400)

  // Server-side schema and optimistic-concurrency validation occur before mutation.
  await rejected(panelId, { op: 'bindings-measurement-recompute', measurement: 'hemWidth',
    expectedValueMm: 400, valueMm: 420, unexpectedGeometry: [[999, 999]] })
  await rejected(panelId, { op: 'bindings-measurement-recompute', measurement: 'hemWidth',
    expectedValueMm: 401, valueMm: 420 })
  await rejected(panelId, { op: 'bindings-measurement-recompute', measurement: 'hemWidth',
    expectedValueMm: 400, valueMm: 5001 })
  await rejected(panelId, { op: 'bindings-measurement-recompute', measurement: 'unknownWidth',
    expectedValueMm: 400, valueMm: 420 })

  const initial = geometry(panelId)
  assert(Math.abs(point(panelId, 3)[0]) < 1e-9)
  for (const [previous, next] of [[400, 420], [420, 430]]) {
    const before = geometry(panelId)
    const after = await set(previous, next)
    assert.equal(after.revision, before.revision + 1, 'Each measurement edit is one native transaction')
    assert.equal(measure(), next, 'Rust must persist the direct measurement')
    assert.equal(snapshot.nativePointBindings.active, true)
    assert(Math.abs(width(panelId) - next / 1000) < 1e-9,
      'Rust recomputes bound target separation from native direct measurement')
    assert(Math.abs(point(panelId, 2)[0] - before.point2[0] - (next - previous) / 1000) < 1e-9,
      'Rust normalizes local coordinates after expanding the bound rectangle')
    const committed = geometry(panelId)
    await request({ op: 'undo' })
    assert.deepEqual(snapshot.template, before.template)
    assert.deepEqual(snapshot.nativePointBindings, before.bindings)
    await request({ op: 'redo' })
    assert.deepEqual(snapshot.template, committed.template)
    assert.deepEqual(snapshot.nativePointBindings, committed.bindings)
  }
  const committed = geometry(panelId)
  await request({ op: 'undo' })
  assert.equal(measure(), 420)
  assert(Math.abs(width(panelId) - .42) < 1e-9)
  await request({ op: 'undo' })
  assert.equal(measure(), 400)
  assert.deepEqual(snapshot.template, initial.template)
  await request({ op: 'redo' })
  assert.equal(measure(), 420)
  await request({ op: 'redo' })
  assert.equal(measure(), 430)
  assert.deepEqual(snapshot.template, committed.template)
  assert.deepEqual(snapshot.nativePointBindings, committed.bindings)

  const saved = await request({ op: 'save' })
  assert.equal(saved.project.native_point_bindings.measurements.hemWidth.valueMm, 430)
  assert.equal(saved.project.native_point_bindings.bindings[0].id, 'measure_hem')
  await request({ op: 'open', project: saved.project })
  assert.deepEqual(snapshot.template, committed.template)
  assert.equal(measure(), 430)
  assert.equal(snapshot.nativePointBindings.active, true)
  await rejected(panelId, { op: 'bindings-measurement-recompute', measurement: 'hemWidth',
    expectedValueMm: 420, valueMm: 440 })
  console.log(JSON.stringify({ passed: true, nativeAuthoritative: true,
    checks: ['real Rust detached rectangle and stored 400 mm binding',
      'direct persisted measurement and dependent point recompute 400→420→430 mm',
      'one native Undo step per edit with repeated Undo and Redo',
      'save/reopen retains geometry, binding and direct measurement',
      'invalid bound, forged expected value and extra-field refusal preserve state'],
    limits: 'Qualified direct numeric binding on detached unsewn straight panel only; no generic formula solver, arbitrary edit regeneration or vendor production certification.' }))
} finally {
  workspace.close()
  fs.rmSync(folder, { recursive: true, force: true })
}
