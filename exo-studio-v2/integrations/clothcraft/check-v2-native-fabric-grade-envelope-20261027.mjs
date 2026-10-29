// Real compiled-Rust fabric grade envelope acceptance. Disposable project only.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createWorkspace } from './workspace.mjs'
import { verifyModarisNativeFabricEnvelopeCommit20261027 } from '../../src/core/modarisNativeFabricEnvelopeWitness20261027.js'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'exo-fabric-grade-real-rust-'))
const workspace = createWorkspace(root)
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const offsets = { XS: -.015, S: -.007, M: 0, L: .005, XL: .010, XXL: .014 }
const sourceProvenance = 'Supplier Fabric Chart #EXO-TEST-20261027, engineering sample, mm, explicitly sourced by test fixture'
const clone = structuredClone
let state, stage = 'initialization'

const send = async command => {
  const result = await workspace.request({ revision: state?.revision, ...command })
  assert.equal(result.ok, true, `${stage}: ${command.op}: ${result.error ?? 'native rejected'}`)
  if (result.data?.template) state = result.data
  return result.data
}
const failClosed = async (command, expectedError) => {
  const beforeRevision = state.revision
  const beforeProject = clone((await send({ op: 'save' })).project)
  const result = await workspace.request({ revision: state.revision, ...command })
  assert.equal(result.ok, false, `${stage}: ${command.op} accepted an invalid request`)
  if (expectedError) assert.match(result.error, expectedError)
  await send({ op: 'snapshot' })
  assert.equal(state.revision, beforeRevision, `${stage}: rejected request changed revision`)
  assert.deepEqual((await send({ op: 'save' })).project, beforeProject,
    `${stage}: rejected request changed persisted project`)
  return result.error
}
const panel = (template, id) => {
  const p = template.panels.find(p => p.id === id)
  assert(p, `Missing native panel ${id}`)
  return p
}
const close = (actual, expected, label) => assert(Number.isFinite(actual) &&
  Math.abs(actual - expected) <= 1e-8, `${label}: ${actual} != ${expected}`)
const verifyCut = (packet, run, id) => {
  assert.equal(packet.format, 'exo-native-graded-cutlines.v1')
  assert.equal(packet.manufacturerReady, false)
  assert.equal(packet.cuttingAuthorized, false)
  assert.deepEqual(packet.sizes.map(r => r.size), sizes)
  for (const [i, size] of sizes.entries()) {
    const authored = panel(run.gradedTemplates[i], id)
    const native = packet.sizes[i].panels.find(p => p.panel_id === id)
    assert(native?.cut, `${size}: physical native CUT missing`)
    assert.deepEqual(native.cut.edges.map(edge => edge.name), authored.polygon.edges)
    for (const edge of native.cut.edges) close(edge.allowance_m, .01, `${size}: allowance`)
  }
}

try {
  stage = 'prepare native disposable manufacturing source'
  await send({ op: 'open', preset: 'tshirt' })
  for (const seam of [...state.template.seams])
    await send({ op: 'edit', command: { kind: 'RemoveSeam', seam: seam.id } })
  const original = new Set(state.template.panels.map(p => p.id))
  for (let i = 0; i < 2; i++) await send({ op: 'edit', command: { kind: 'Polygon',
    fabric: state.template.fabrics[0].id,
    points: [[0, 0], [.4, 0], [.4, .32], [0, .32]] } })
  const ids = state.template.panels.filter(p => !original.has(p.id)).map(p => p.id)
  assert.equal(ids.length, 2, 'Expected two Rust-authored native polygons')
  const physical = (await send({ op: 'save' })).project
  for (const p of physical.template.panels)
    p.polygon.seam_allowances = Object.fromEntries(p.polygon.edges.map(edge => [edge, .01]))
  physical.state = null
  physical.mesh_signature = null
  await send({ op: 'open', project: physical })
  await send({ op: 'bindings-store', nativeBindings: {
    measurements: { sharedWidth: { valueMm: 400 } },
    bindings: ids.map((panelId, i) => ({ id: `fabric_width_${i + 1}`, panelId, pointIndex: 1,
      mode: 'polar', a: 0, b: 0, angleDeg: 0,
      distanceFormula: 'sharedWidth', dependsOn: [] })),
  } })
  const base = clone(state.template)
  await send({ op: 'grade-run-commit', gradeRun: {
    schemaVersion: 1, sizes, baseSize: 'M', baseTemplate: clone(base),
    gradedTemplates: sizes.map(size => {
      const template = clone(base)
      for (const id of ids) panel(template, id).polygon.points[1][0] += offsets[size]
      return template
    }), pomSpecs: [],
  } })
  const chart = { schemaVersion: 1, provenance: sourceProvenance,
    fabricId: state.template.fabrics[0].id,
    sourceTemplate: clone(state.template),
    measurements: { sharedWidth: Object.fromEntries(sizes.map(size => [size, {
      minMm: 390, maxMm: 430,
    }])) } }

  stage = 'persist sourced six-size fabric envelope'
  const savedEnvelope = await send({ op: 'fabric-grade-envelope-store', envelope: chart })
  assert.equal(state.fabricGradeEnvelope?.provenance, sourceProvenance)
  assert.deepEqual(state.fabricGradeEnvelope?.measurements?.sharedWidth, chart.measurements.sharedWidth)
  assert.equal(state.fabricGradeEnvelope?.schemaVersion, 1)
  assert(savedEnvelope)
  const inspected = await send({ op: 'fabric-grade-envelope-inspect' })
  assert(inspected, 'Rust did not provide envelope inspection evidence')
  const saved = (await send({ op: 'save' })).project
  assert.deepEqual(saved.fabric_grade_envelope?.measurements, chart.measurements)
  assert.equal(saved.fabric_grade_envelope?.provenance, sourceProvenance)
  const beforeRevision = state.revision
  const beforeProject = clone(saved)
  for (const id of ids) verifyCut(await send({ op: 'grade-run-cutlines' }), saved.grade_run, id)

  stage = 'out-of-range, forged and stale fail-closed requests'
  await failClosed({ op: 'bindings-grade-regenerate-preview', overrides: { sharedWidth: 431 } }, /envelope|bounds|range|violation/i)
  await failClosed({ op: 'bindings-grade-regenerate', overrides: { sharedWidth: 431 } }, /envelope|bounds|range|violation/i)
  await failClosed({ op: 'fabric-grade-envelope-store', envelope: {
    ...chart, sourceTemplate: { ...chart.sourceTemplate, panels: [] },
  } }, /source|template|invalid|stale/i)
  await failClosed({ op: 'fabric-grade-envelope-store', envelope: {
    ...chart, measurements: { sharedWidth: { M: { minMm: 390, maxMm: 430 } } },
  } }, /coverage|size|invalid|fabric/i)
  await failClosed({ op: 'fabric-grade-envelope-store', envelope: chart,
    revision: beforeRevision - 1 }, /stale|revision/i)
  stage = 'guard all native mutation paths under saved envelope'
  await failClosed({ op: 'edit', command: { kind: 'RemoveSeam', seam: 'missing-seam' } },
    /envelope|clear|source|unsupported/i)
  await failClosed({ op: 'edit-batch', commands: [{ kind: 'RemoveSeam', seam: 'missing-seam' }] },
    /envelope|clear|source|unsupported/i)
  await failClosed({ op: 'bindings-store', nativeBindings: {
    measurements: { sharedWidth: { valueMm: 401 } }, bindings: [],
  } }, /envelope|clear|source|unsupported/i)
  await failClosed({ op: 'grade-run-commit', gradeRun: clone(beforeProject.grade_run) },
    /envelope|clear|source|unsupported/i)
  await failClosed({ op: 'set-property', target: 'fabric', id: chart.fabricId,
    field: 'name', value: 'mutated fabric' }, /envelope|clear|source|unsupported/i)

  stage = '400 to 420 mm native six-size recomputation'
  const preview = await send({ op: 'bindings-grade-regenerate-preview', overrides: { sharedWidth: 420 } })
  assert.equal(preview.format, 'exo-native-reactive-size-run.v1')
  assert.equal(preview.sourceRevision, beforeRevision)
  assert.deepEqual(preview.bySize.map(row => row.size), sizes)
  assert.equal(state.revision, beforeRevision)
  assert.deepEqual((await send({ op: 'save' })).project, beforeProject)
  const committed = await send({ op: 'bindings-grade-regenerate', overrides: { sharedWidth: 420 } })
  assert.equal(state.revision, beforeRevision + 1)
  assert.deepEqual(committed.regenerationEvidence, preview)
  assert.equal(state.nativePointBindings.measurements.sharedWidth.valueMm, 420)
  for (const id of ids) close(panel(state.template, id).polygon.points[1][0], .42, 'native base width')
  const afterProject = (await send({ op: 'save' })).project
  assert.equal(afterProject.fabric_grade_envelope?.provenance, sourceProvenance)
  assert.deepEqual(afterProject.fabric_grade_envelope?.sourceTemplate, afterProject.template)
  for (const [i, size] of sizes.entries()) for (const id of ids)
    close(panel(afterProject.grade_run.gradedTemplates[i], id).polygon.points[1][0],
      .42 + offsets[size], `${size} regenerated native graded width`)
  const witness = verifyModarisNativeFabricEnvelopeCommit20261027({
    beforeProject, afterProject, beforeRevision, afterRevision: state.revision,
    measurement: 'sharedWidth', expectedValueMm: 420,
  })
  assert.equal(witness.ok, true, `Independent native fabric envelope witness: ${witness.reason}`)
  assert.equal(witness.checkedBoundTargets, 12)
  for (const id of ids) verifyCut(await send({ op: 'grade-run-cutlines' }), afterProject.grade_run, id)
  await failClosed({ op: 'bindings-grade-regenerate', overrides: { sharedWidth: 421 },
    revision: beforeRevision }, /stale|revision/i)

  stage = 'reverse bound physical Anchor regenerates chart and six-size CUT'
  const reverseBeforeRevision = state.revision
  const reverseBeforeProject = clone((await send({ op: 'save' })).project)
  await failClosed({ op: 'edit', command: { kind: 'Anchor', panel: ids[0],
    anchor: 1, position: [.44, 0] } }, /envelope|range|bounds|violation/i)
  const reverseCommit = await send({ op: 'edit', command: { kind: 'Anchor',
    panel: ids[0], anchor: 1, position: [.41, 0] } })
  assert(reverseCommit, 'Rust returned no reverse Anchor result')
  assert.equal(state.revision, reverseBeforeRevision + 1)
  assert.equal(state.nativePointBindings.measurements.sharedWidth.valueMm, 410)
  const reverseProject = clone((await send({ op: 'save' })).project)
  assert.equal(reverseProject.fabric_grade_envelope?.fabricId, chart.fabricId)
  assert.equal(reverseProject.fabric_grade_envelope?.provenance, sourceProvenance)
  assert.deepEqual(reverseProject.fabric_grade_envelope?.measurements, chart.measurements)
  assert.deepEqual(reverseProject.fabric_grade_envelope?.sourceTemplate, reverseProject.template)
  for (const id of ids) {
    close(panel(state.template, id).polygon.points[1][0], .41, `${id} reverse base width`)
    for (const [i, size] of sizes.entries())
      close(panel(reverseProject.grade_run.gradedTemplates[i], id).polygon.points[1][0],
        .41 + offsets[size], `${size}/${id} reverse graded width`)
  }
  const reverseWitness = verifyModarisNativeFabricEnvelopeCommit20261027({
    beforeProject: reverseBeforeProject, afterProject: reverseProject,
    beforeRevision: reverseBeforeRevision, afterRevision: state.revision,
    measurement: 'sharedWidth', expectedValueMm: 410,
  })
  assert.equal(reverseWitness.ok, true, `Independent reverse Anchor witness: ${reverseWitness.reason}`)
  assert.equal(reverseWitness.checkedBoundTargets, 12)
  for (const id of ids) verifyCut(await send({ op: 'grade-run-cutlines' }), reverseProject.grade_run, id)
  await failClosed({ op: 'edit', command: { kind: 'Anchor', panel: ids[1],
    anchor: 1, position: [.44, 0] } }, /envelope|range|bounds|violation/i)

  stage = 'reverse Anchor Undo Redo save reopen'
  await send({ op: 'undo' })
  assert.deepEqual(state.template, reverseBeforeProject.template)
  assert.equal(state.nativePointBindings.measurements.sharedWidth.valueMm, 420)
  assert.deepEqual(state.fabricGradeEnvelope?.measurements, chart.measurements)
  await send({ op: 'redo' })
  assert.deepEqual(state.template, reverseProject.template)
  assert.equal(state.nativePointBindings.measurements.sharedWidth.valueMm, 410)
  assert.equal(state.fabricGradeEnvelope?.provenance, sourceProvenance)
  const reverseReopened = clone((await send({ op: 'save' })).project)

  stage = 'undo, redo and saved reopening'
  await send({ op: 'undo' })
  assert.deepEqual(state.template, reverseBeforeProject.template)
  assert.equal(state.nativePointBindings.measurements.sharedWidth.valueMm, 420)
  assert.deepEqual(state.fabricGradeEnvelope?.measurements, chart.measurements)
  await send({ op: 'redo' })
  assert.deepEqual(state.template, reverseProject.template)
  assert.equal(state.nativePointBindings.measurements.sharedWidth.valueMm, 410)
  assert.deepEqual(state.fabricGradeEnvelope?.measurements, chart.measurements)
  const reopened = (await send({ op: 'save' })).project
  await send({ op: 'open', project: reopened })
  assert.equal(state.fabricGradeEnvelope?.provenance, sourceProvenance)
  assert.deepEqual((await send({ op: 'save' })).project.fabric_grade_envelope,
    reverseProject.fabric_grade_envelope)
  assert.equal(state.nativePointBindings.measurements.sharedWidth.valueMm, 410)
  assert.equal(state.fabricGradeEnvelope?.fabricId, chart.fabricId)
  for (const id of ids) verifyCut(await send({ op: 'grade-run-cutlines' }), reverseReopened.grade_run, id)
  for (const id of ids) verifyCut(await send({ op: 'grade-run-cutlines' }), reopened.grade_run, id)
  stage = 'explicit envelope clear and one-step undo'
  const clearRevision = state.revision
  await send({ op: 'fabric-grade-envelope-clear' })
  assert.equal(state.revision, clearRevision + 1)
  assert.equal(state.fabricGradeEnvelope, null)
  assert.equal((await send({ op: 'save' })).project.fabric_grade_envelope, undefined)
  await send({ op: 'undo' })
  assert.equal(state.fabricGradeEnvelope?.provenance, sourceProvenance)
  assert.deepEqual((await send({ op: 'save' })).project.fabric_grade_envelope,
    reverseProject.fabric_grade_envelope)
  console.log(JSON.stringify({ passed: true, native: true, sizes, beforeRevision,
    afterRevision: beforeRevision + 1, factoryApproved: false,
    verified: ['sourced six-size mm chart saved in FittingProject',
      'all sizes cutline geometry from physical 10mm allowances',
      'out-of-range, forged, incomplete and stale requests fail closed',
      '400 to 420mm six-size native regeneration in one revision',
      'Reverse physical bound Anchor 420 to 410mm regenerates all six sizes in one revision',
      'Out-of-envelope 440mm Anchor rolls back exact revision and project',
      'Undo, Redo, save and reopen retain chart provenance and CUT geometry',
      'Explicit envelope clear removes persisted chart and Undo restores it'] }))
} catch (error) {
  console.error(JSON.stringify({ passed: false, stage, error: error.message }))
  process.exitCode = 1
} finally {
  workspace.close()
  fs.rmSync(root, { recursive: true, force: true })
}
