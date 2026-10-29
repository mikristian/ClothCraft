// Disposable REAL Rust acceptance: explicit source-reference recomputation,
// persisted rule identity, all-binding satisfaction, Undo/Redo and save/reopen.
// No production garment, factory or automatically reactive Rust graph claim.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createWorkspace } from './workspace.mjs'
import { createNativePatternConstraintSidecar20261023 as create } from '../../src/core/nativePatternConstraintBindings20261023.js'
import { planModarisNativeReferenceRecompute20261027 as plan } from '../../src/core/modarisNativeReferenceRecompute20261027.js'
import { witnessModarisNativeReferenceCommit20261027 as witness } from '../../src/core/modarisNativeReferenceCommitWitness20261027.js'

const output = fs.mkdtempSync(path.join(os.tmpdir(), 'exo-modaris-reference-witness-'))
const workspace = createWorkspace(output)
let snapshot = null
const request = async payload => {
  const response = await workspace.request({ revision: snapshot?.revision, ...payload })
  assert.equal(response.ok, true, response.error)
  if (response.data?.template) snapshot = response.data
  return response.data
}
const measurements = { height: { valueMm: 300 } }
let panelId
const bindings = () => [{
  id: 'reference-dependent-height', panelId, pointIndex: 2,
  mode: 'polar', a: 1, b: 0, angleDeg: 90,
  distanceFormula: 'height', dependsOn: [],
}]
const source = () => ({ revision: snapshot.revision, template: snapshot.template })

async function cycle(targetWidth) {
  const before = structuredClone(source())
  const panel = before.template.panels.find(item => item.id === panelId)
  const old = panel.polygon.points[1]
  const input = { panelId, pointIndex: 1, originalPosition: [...old],
    position: [targetWidth, old[1]] }
  const created = create(before, { measurements, bindings: bindings() })
  assert.equal(created.ok, true, created.reason)
  const prepared = plan(before, created.sidecar, input)
  assert.equal(prepared.ok, true, prepared.reason)
  assert.equal(prepared.proposal.commands.length, 1)
  assert.equal(prepared.proposal.commands[0].edits.length, 2)

  const rejected = await workspace.request({ op: 'edit-batch', revision: snapshot.revision,
    commands: [...prepared.proposal.commands,
      { kind: 'Anchor', panel: 'nonexistent', anchor: 0, position: [0, 0] }],
    nativeBindings: { measurements, bindings: bindings() } })
  assert.equal(rejected.ok, false, 'An invalid last command must refuse the whole Rust transaction')
  await request({ op: 'snapshot' })
  assert.deepEqual(source(), before, 'Rejected native batch mutated the document')

  await request({ op: 'edit-batch', commands: prepared.proposal.commands,
    nativeBindings: { measurements, bindings: bindings() } })
  const after = structuredClone(snapshot)
  assert.equal(after.revision, before.revision + 1)
  assert.equal(after.nativePointBindings?.active, true)
  const checked = witness(before, after, created.sidecar, input, prepared.proposal)
  assert.equal(checked.ok, true, JSON.stringify({ reason: checked.reason,
    actual: after.nativePointBindings, expected: created.sidecar.bindings }))
  assert.deepEqual(checked.verifiedBindingIds, ['reference-dependent-height'])
  assert(Math.abs(after.template.panels.find(p => p.id === panelId).polygon.points[2][0] -
    targetWidth) < 1e-9)
  assert.equal(checked.nativeAutomaticRegeneration, false)
  const tampered = structuredClone(after)
  tampered.nativePointBindings.measurements.height.valueMm += 10
  assert.equal(witness(before, tampered, created.sidecar, input, prepared.proposal).ok, false)

  await request({ op: 'undo' })
  assert.deepEqual(snapshot.template, before.template)
  await request({ op: 'redo' })
  assert.deepEqual(snapshot.template, after.template)
  assert.equal(snapshot.nativePointBindings?.active, true)
  const saved = await request({ op: 'save' })
  assert.equal(saved.project.native_point_bindings?.bindings?.length, 1)
  await request({ op: 'open', project: saved.project })
  assert.deepEqual(snapshot.template, after.template)
  assert.equal(snapshot.nativePointBindings?.active, true)
  assert.equal(snapshot.nativePointBindings.bindings[0].id, bindings()[0].id)
  assert.equal(snapshot.nativePointBindings.bindings[0].distanceFormula, bindings()[0].distanceFormula)
  return { committedRevision: after.revision, reopenedRevision: snapshot.revision,
    width: targetWidth, bindingCount: checked.persistedNativeBindingCount }
}

try {
  await request({ op: 'open', preset: 'tshirt' })
  const fabric = snapshot.template.fabrics[0].id
  const existing = new Set(snapshot.template.panels.map(panel => panel.id))
  await request({ op: 'edit', command: {
    kind: 'Polygon', points: [[0, 0], [.4, 0], [.4, .3], [0, .3]], fabric,
  } })
  const newPanels = snapshot.template.panels.filter(panel => !existing.has(panel.id))
  assert.equal(newPanels.length, 1)
  panelId = newPanels[0].id
  assert.equal(snapshot.template.seams?.some(seam =>
    seam.a?.panel === panelId || seam.b?.panel === panelId), false)
  await request({ op: 'bindings-store', nativeBindings: {
    measurements, bindings: bindings(),
  } })
  assert.equal(snapshot.nativePointBindings?.active, true)
  const cycles = [await cycle(.42), await cycle(.43)]
  console.log(JSON.stringify({
    passed: true, cycles, checks: [
      'native unsown Polygon and persisted measurement rule',
      'invalid atomic source/dependent command rolls back',
      'all Rust saved point definitions and geometry witnessed after each commit',
      'native Undo/Redo restores one grouped revision',
      'Rust save/reopen preserves both rule identity and dependent point geometry',
      'second reference edit regenerates the same linked point after reopening',
    ], limitations: 'Explicit qualified one-panel recomputation; not automatic Rust all-size industrial dependency parity.',
  }))
} finally {
  workspace.close()
  fs.rmSync(output, { recursive: true, force: true })
}
