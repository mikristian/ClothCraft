// Native Rust sewn + CUT + reactive six-size acceptance. Disposable project only.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createWorkspace } from './workspace.mjs'
import { verifyModarisNativeSewnReactiveWitness20261027 } from '../../src/core/modarisNativeSewnReactiveWitness20261027.js'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'exo-reactive-sewn-industrial-'))
const workspace = createWorkspace(root)
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const offsets = { XS: -.015, S: -.007, M: 0, L: .005, XL: .010, XXL: .014 }
const checks = []
let state, stage = 'initialize', beforeRevision = null, committedRevision = null
const clone = structuredClone
const panel = (template, id) => {
  const found = template.panels.find(item => item.id === id)
  assert(found, `Missing native panel ${id}`)
  return found
}
const send = async command => {
  const reply = await workspace.request({ revision: state?.revision, ...command })
  assert.equal(reply.ok, true, `${command.op}: ${reply.error ?? 'native Rust rejected'}`)
  if (reply.data?.template) state = reply.data
  return reply.data
}
const reject = async command => {
  const previous = (await send({ op: 'save' })).project
  const revision = state.revision
  const reply = await workspace.request({ revision, ...command })
  assert.equal(reply.ok, false, `Invalid ${command.op} unexpectedly accepted`)
  await send({ op: 'snapshot' })
  assert.equal(state.revision, revision)
  assert.deepEqual((await send({ op: 'save' })).project, previous)
  return reply.error
}
const checkNative = (cuts, balance, project, seamId, ids, phase) => {
  assert.equal(cuts.format, 'exo-native-graded-cutlines.v1')
  assert.equal(cuts.cuttingAuthorized, false)
  assert.equal(cuts.manufacturerReady, false)
  assert.equal(balance.format, 'exo-native-six-size-sewn-balance-audit.v1')
  assert.equal(balance.factoryApproved, false)
  assert.equal(balance.easeReviewRequired, false)
  assert.deepEqual(cuts.sizes.map(x => x.size), sizes)
  assert.deepEqual(balance.sizes.map(x => x.size), sizes)
  const positions = []
  for (let i = 0; i < sizes.length; i++) {
    const template = project.grade_run.gradedTemplates[i]
    const balanceRow = balance.sizes[i]
    const seam = balanceRow.seams.find(item => item.seamId === seamId)
    assert(seam, `${phase}/${sizes[i]} missing native sewn correspondence`)
    assert.equal(seam.allowEase, false)
    assert.equal(seam.requiresEaseReview, false)
    assert.equal(seam.a.panelId, ids[0])
    assert.equal(seam.b.panelId, ids[1])
    assert.deepEqual(seam.a.interval, [0, 1])
    assert.deepEqual(seam.b.interval, [0, 1])
    assert.equal(seam.b.reversed, true)
    assert(Math.abs(seam.mismatchM) < 1e-7, `${phase}/${sizes[i]} seam mismatch ${seam.mismatchM}`)
    assert.equal(seam.notchIntervalLengthsM.length, 3)
    for (const interval of seam.notchIntervalLengthsM)
      assert(Math.abs(interval[0] - interval[1]) < 1e-7, `${phase}/${sizes[i]} physical notch interval mismatch`)
    for (const id of ids) {
      const authored = panel(template, id)
      const row = cuts.sizes[i].panels.find(item => item.panel_id === id)
      assert(row?.cut, `${phase}/${sizes[i]}/${id} missing CUT`)
      assert.deepEqual(row.cut.edges.map(e => e.name), authored.polygon.edges)
      for (const edge of row.cut.edges) {
        assert(Math.abs(edge.allowance_m - .01) < 1e-9)
        assert(Number.isFinite(row.sewline_edge_lengths_m[edge.name]))
      }
      assert.equal(row.cut.notches.length, 2, `${phase}/${sizes[i]}/${id} missing physical paired notches`)
      for (const [index, notch] of row.cut.notches.entries()) {
        assert.equal(notch.edge_id, authored.polygon.edges[0])
        assert(Math.abs(notch.t - (index ? .75 : .25)) < 1e-9)
        assert(Math.abs(notch.depth_m - .004) < 1e-9)
        assert(Math.abs(Math.hypot(notch.cut_start[0] - notch.inner_end[0],
          notch.cut_start[1] - notch.inner_end[1]) - .004) < 1e-7)
        positions.push({ size: sizes[i], panel: id, position: notch.cut_start })
      }
    }
  }
  assert.equal(positions.length, 24)
  return positions
}
try {
  stage = 'author two real native rectangles and Sew'
  await send({ op: 'open', preset: 'tshirt' })
  for (const seam of [...state.template.seams])
    await send({ op: 'edit', command: { kind: 'RemoveSeam', seam: seam.id } })
  const originalIds = new Set(state.template.panels.map(p => p.id))
  for (let i = 0; i < 2; i++)
    await send({ op: 'edit', command: { kind: 'Polygon', fabric: state.template.fabrics[0].id,
      points: [[0, 0], [.4, 0], [.4, .32], [0, .32]] } })
  const ids = state.template.panels.filter(p => !originalIds.has(p.id)).map(p => p.id)
  assert.equal(ids.length, 2)
  const ref = id => ({ panel: id, side: 'top', edge: panel(state.template, id).polygon.edges[0], range: [0, 1] })
  await send({ op: 'edit', command: { kind: 'Sew', a: ref(ids[0]), b: ref(ids[1]),
    reverse: true, ease: false } })
  const sewn = state.template.seams.find(s => s.a.panel === ids[0] && s.b.panel === ids[1])
  assert(sewn, 'Rust did not persist requested named sewn correspondence')
  assert.equal(sewn.allow_ease, false)
  assert.equal(sewn.reverse_b, true)
  checks.push('Native 400x320mm polygons and named equal Sew intervals')

  stage = 'physical manufacturing source before bindings'
  const project = (await send({ op: 'save' })).project
  for (const p of project.template.panels)
    p.polygon.seam_allowances = Object.fromEntries(p.polygon.edges.map(edge => [edge, .01]))
  for (const id of ids) {
    const p = panel(project.template, id)
    p.polygon.notches = { [p.polygon.edges[0]]: [
      { t: .25, depth_m: .004 }, { t: .75, depth_m: .004 },
    ] }
  }
  // Rust requires explicit ordered correspondences in addition to physical
  // panel marks. Reversed B maps the symmetric pair back to .25/.75.
  project.template.seams.find(s => s.id === sewn.id).notches = [[.25, .25], [.75, .75]]
  project.state = null
  project.mesh_signature = null
  await send({ op: 'open', project })
  assert.equal(state.template.seams.find(s => s.id === sewn.id)?.id, sewn.id)
  await send({ op: 'bindings-store', nativeBindings: {
    measurements: { width: { valueMm: 400 } },
    bindings: ids.map((panelId, index) => ({ id: `sewn_width_${index}`, panelId,
      pointIndex: 1, mode: 'polar', a: 0, b: 0, angleDeg: 0,
      distanceFormula: 'width', dependsOn: [] })),
  } })
  assert.equal(state.nativePointBindings.active, true)
  const base = clone(state.template)
  const run = { schemaVersion: 1, sizes, baseSize: 'M', baseTemplate: clone(base),
    gradedTemplates: sizes.map(size => {
      const t = clone(base)
      for (const id of ids) panel(t, id).polygon.points[1][0] += offsets[size]
      return t
    }), pomSpecs: [] }
  await send({ op: 'grade-run-commit', gradeRun: run })
  assert.equal(state.gradeRunPersisted, true)
  const before = (await send({ op: 'save' })).project
  beforeRevision = state.revision
  const beforeCut = await send({ op: 'grade-run-cutlines' })
  const beforeSew = await send({ op: 'grade-run-sewing-balance-audit' })
  const originalPhysical = checkNative(beforeCut, beforeSew, before, sewn.id, ids, 'before')
  checks.push('Six persisted Rust CUT and sewn-balance receipts: 24 paired physical notches')

  stage = 'reactive preview and one native commit'
  const payload = { overrides: { width: 380 } }
  const preview = await workspace.request({ op: 'bindings-grade-regenerate-preview',
    revision: state.revision, ...payload })
  if (!preview.ok) {
    const denied = await workspace.request({ op: 'bindings-grade-regenerate',
      revision: state.revision, ...payload })
    assert.equal(denied.ok, false)
    assert.deepEqual((await send({ op: 'save' })).project, before)
    throw Error(`BLOCKED: native sewn industrial regeneration refused: ${preview.error}; commit: ${denied.error}`)
  }
  assert.deepEqual(preview.data.bySize.map(r => r.size), sizes)
  assert.deepEqual((await send({ op: 'save' })).project, before, 'Preview modified source')
  const committed = await send({ op: 'bindings-grade-regenerate', ...payload })
  committedRevision = state.revision
  assert.equal(committedRevision, beforeRevision + 1)
  assert.deepEqual(committed.regenerationEvidence, preview.data)
  const after = (await send({ op: 'save' })).project
  const afterCut = await send({ op: 'grade-run-cutlines' })
  const afterSew = await send({ op: 'grade-run-sewing-balance-audit' })
  const moved = checkNative(afterCut, afterSew, after, sewn.id, ids, 'after')
  assert.notDeepEqual(moved, originalPhysical)
  assert.equal(after.template.seams.find(s => s.id === sewn.id)?.id, sewn.id)
  for (let i = 0; i < sizes.length; i++) for (const id of ids) {
    const p = panel(after.grade_run.gradedTemplates[i], id)
    assert(Math.abs(p.polygon.points[1][0] - (.38 + offsets[sizes[i]])) < 1e-8)
    assert.deepEqual(p.polygon.notches, panel(base, id).polygon.notches)
    assert.deepEqual(p.polygon.seam_allowances, panel(base, id).polygon.seam_allowances)
  }
  const witness = verifyModarisNativeSewnReactiveWitness20261027({
    beforeProject: before, afterProject: after,
    beforeCutlines: beforeCut, afterCutlines: afterCut,
    beforeSewing: beforeSew, afterSewing: afterSew,
    beforeRevision, afterRevision: committedRevision, changedPanelIds: ids,
  })
  assert.equal(witness.ok, true, `Independent sewn+industrial witness: ${witness.reason}`)
  checks.push('One Rust revision changes CUT geometry while retaining paired seam references')

  stage = 'undo redo save reopen and fail-closed rollback'
  await send({ op: 'undo' })
  assert.deepEqual(state.template, before.template)
  await send({ op: 'redo' })
  assert.deepEqual(state.template, after.template)
  const persisted = (await send({ op: 'save' })).project
  await send({ op: 'open', project: persisted })
  assert.deepEqual(checkNative(await send({ op: 'grade-run-cutlines' }),
    await send({ op: 'grade-run-sewing-balance-audit' }), persisted, sewn.id, ids, 'reopened'), moved)
  const staleError = await reject({ op: 'bindings-grade-regenerate', revision: beforeRevision, ...payload })
  const invalidWidthError = await reject({ op: 'bindings-grade-regenerate', overrides: { width: 5001 } })
  const asymmetric = clone(persisted.grade_run)
  const target = panel(asymmetric.gradedTemplates[5], ids[1])
  target.polygon.points[0][0] += .04
  const asymmetricError = await reject({ op: 'grade-run-commit', gradeRun: asymmetric })
  const corrupted = clone(persisted.grade_run)
  corrupted.gradedTemplates[5].seams.find(s => s.id === sewn.id).allow_ease = true
  const easeError = await reject({ op: 'grade-run-commit', gradeRun: corrupted })
  checks.push('Undo, redo, save/reopen, stale revision and invalid width plus asymmetric/ease rollback')
  console.log(JSON.stringify({ passed: true, nativeRust: true, disposable: true,
    sewnIndustrialPropagationAccepted: true, beforeRevision, committedRevision,
    sizes, sewnSeamId: sewn.id, pairedNotchesPerSize: 4, checks,
    staleError, invalidWidthError, asymmetricError, easeError,
    factoryApproved: false, cuttingAuthorized: false }, null, 2))
} catch (error) {
  console.log(JSON.stringify({ passed: false, nativeRust: true, disposable: true,
    sewnIndustrialPropagationAccepted: false, stage,
    reason: error?.message ?? String(error), beforeRevision, committedRevision, checks,
    factoryApproved: false, cuttingAuthorized: false }, null, 2))
  process.exitCode = 1
} finally {
  workspace.close()
  fs.rmSync(root, { recursive: true, force: true })
}
