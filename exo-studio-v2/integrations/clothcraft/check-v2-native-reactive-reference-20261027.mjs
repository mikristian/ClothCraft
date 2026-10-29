// Disposable compiled Rust bridge acceptance for a NATIVE (not JS-planned)
// source anchor -> dependent anchor recomputation and persisted rule graph.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createWorkspace } from './workspace.mjs'

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'exo-native-reactive-ref-'))
const workspace = createWorkspace(folder)
let snapshot
const request = async data => {
  const result = await workspace.request({ revision: snapshot?.revision, ...data })
  assert.equal(result.ok, true, result.error)
  if (result.data?.template) snapshot = result.data
  return result.data
}
const refused = async data => {
  const previous = structuredClone(snapshot)
  const result = await workspace.request({ revision: snapshot.revision, ...data })
  assert.equal(result.ok, false, 'Invalid native reactive edit must refuse')
  await request({ op: 'snapshot' })
  assert.deepEqual(snapshot.template, previous.template)
  assert.equal(snapshot.revision, previous.revision)
  return result.error
}
const point = (id, index) => snapshot.template.panels.find(p => p.id === id).polygon.points[index]

try {
  await request({ op: 'open', preset: 'tshirt' })
  const existing = new Set(snapshot.template.panels.map(p => p.id))
  await request({ op: 'edit', command: {
    kind: 'Polygon', fabric: snapshot.template.fabrics[0].id,
    points: [[0, 0], [.4, 0], [.4, .4], [0, .4]],
  } })
  const [panel] = snapshot.template.panels.filter(p => !existing.has(p.id))
  assert(panel)
  const panelId = panel.id
  const nativeBindings = {
    measurements: { hemWidth: { valueMm: 400 } },
    bindings: [{ id: 'reactive_hem', panelId, pointIndex: 3,
      mode: 'polar', a: 2, b: 1, angleDeg: 180,
      distanceFormula: 'hemWidth', dependsOn: [] }],
  }
  await request({ op: 'bindings-store', nativeBindings })
  assert.equal(snapshot.nativePointBindings.active, true)
  const before = structuredClone(snapshot)
  const invalid = await refused({ op: 'bindings-anchor-recompute',
    panel: panelId, sourcePointIndex: 2,
    expectedPosition: [0.4, 0.401], position: [0.42, 0.4] })
  assert.match(invalid, /expected original coordinate/)

  for (const width of [.42, .43]) {
    const original = [...point(panelId, 2)]
    const after = await request({ op: 'bindings-anchor-recompute',
      panel: panelId, sourcePointIndex: 2,
      expectedPosition: original, position: [width, original[1]] })
    assert.equal(after.nativeReferenceRecompute.nativeAuthoritative, true)
    assert.equal(after.nativeReferenceRecompute.oneUndoStep, true)
    assert.deepEqual(after.nativeReferenceRecompute.correctedBindingIds, ['reactive_hem'])
    assert.equal(after.nativePointBindings.active, true)
    assert.equal(after.nativePointBindings.automaticRegeneration, false)
    assert(Math.abs(point(panelId, 2)[0] - width) < 1e-9)
    assert(Math.abs(point(panelId, 3)[0] - (width - .4)) < 1e-9)
  }
  const committed = structuredClone(snapshot)
  await request({ op: 'undo' })
  assert(Math.abs(point(panelId, 2)[0] - .42) < 1e-9)
  assert.equal(snapshot.nativePointBindings.active, true)
  await request({ op: 'redo' })
  assert.deepEqual(snapshot.template, committed.template)
  const saved = await request({ op: 'save' })
  assert.equal(saved.project.native_point_bindings.bindings[0].id, 'reactive_hem')
  await request({ op: 'open', project: saved.project })
  assert.deepEqual(snapshot.template, committed.template)
  assert.equal(snapshot.nativePointBindings.active, true)
  assert(Math.abs(point(panelId, 3)[0] - .03) < 1e-9)
  await refused({ op: 'bindings-anchor-recompute', panel: panelId,
    sourcePointIndex: 2, expectedPosition: [...point(panelId, 2)],
    position: [0.4, 0] })
  console.log(JSON.stringify({ passed: true, nativeAuthoritative: true,
    checks: ['source and dependent recomputed by Rust, no JS supplied dependent coordinates',
      'two serial 400→420→430 mm edits', 'one Undo/Redo per native source edit',
      'persisted binding and geometry survive Rust save/reopen',
      'forged original and collapsed edge fail without mutation'],
    limitations: 'Explicit opt-in, one unsewn straight panel, direct numeric measurement; no arbitrary-edit automatic regeneration, graded chart, sewn/industrial graph or licensed vendor/factory acceptance.' }))
} finally {
  workspace.close()
  fs.rmSync(folder, { recursive: true, force: true })
}
