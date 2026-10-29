// Real native Rust acceptance: bind AFTER creating physical manufacturing attachments.
// The only modified garment lives in this disposable directory.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createWorkspace } from './workspace.mjs'
import { verifyModarisNativeIndustrialReactiveWitness20261027 } from '../../src/core/modarisNativeIndustrialReactiveWitness20261027.js'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'exo-reactive-notch-20261027-'))
const workspace = createWorkspace(root)
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const offsets = { XS: -.015, S: -.007, M: 0, L: .005, XL: .010, XXL: .014 }
const checks = [], blocked = []
let state, stage = 'initialization', verifiedCommittedRevision = null
const copy = value => structuredClone(value)
const near = (actual, expected, name, eps = 1e-8) =>
  assert(Number.isFinite(actual) && Math.abs(actual - expected) <= eps, `${name}: ${actual} != ${expected}`)
const request = async value => {
  const reply = await workspace.request({ revision: state?.revision, ...value })
  assert.equal(reply.ok, true, `${value.op}: ${reply.error ?? 'native request refused'}`)
  if (reply.data?.template) state = reply.data
  return reply.data
}
const panel = (template, id) => {
  const value = template.panels.find(p => p.id === id)
  assert(value, `missing panel ${id}`)
  return value
}
const expectRejected = async value => {
  const prior = copy(state)
  const saved = (await request({ op: 'save' })).project
  const result = await workspace.request({ revision: prior.revision, ...value })
  assert.equal(result.ok, false, `${value.op} must reject invalid input`)
  await request({ op: 'snapshot' })
  assert.equal(state.revision, prior.revision)
  assert.deepEqual(state.template, prior.template)
  assert.deepEqual(state.nativePointBindings, prior.nativePointBindings)
  assert.deepEqual((await request({ op: 'save' })).project, saved)
  return result.error
}
const physicalSignature = template => template.panels.map(p => ({
  id: p.id, edges: p.polygon.edges, allowances: p.polygon.seam_allowances,
  notches: p.polygon.notches,
}))
const checkCut = (packet, run, targetId, phase) => {
  assert.equal(packet.format, 'exo-native-graded-cutlines.v1')
  assert.equal(packet.manufacturerReady, false)
  assert.equal(packet.cuttingAuthorized, false)
  assert.deepEqual(packet.sizes.map(p => p.size), sizes)
  const positions = []
  for (let i = 0; i < sizes.length; i++) {
    const template = run.gradedTemplates[i]
    const row = packet.sizes[i]
    assert.equal(row.panels.length, template.panels.length)
    for (const authored of template.panels) {
      const native = row.panels.find(p => p.panel_id === authored.id)
      assert(native?.cut, `${phase}: missing CUT for ${sizes[i]}/${authored.id}`)
      const cut = native.cut
      assert.deepEqual(cut.edges.map(e => e.name), authored.polygon.edges)
      for (const edge of cut.edges) {
        near(edge.allowance_m, .01, `${phase}/${sizes[i]}/${authored.id}/${edge.name} allowance`)
        assert(Number.isFinite(native.sewline_edge_lengths_m[edge.name]))
      }
      assert(cut.area_m2 > 0 && Number.isFinite(cut.area_m2))
      assert(cut.perimeter_m > 0 && Number.isFinite(cut.perimeter_m))
      const expected = authored.id === targetId ? 2 : 0
      assert.equal(cut.notches.length, expected, `${phase}/${sizes[i]}/${authored.id} physical notch count`)
      if (expected) {
        const edge = authored.polygon.edges[0]
        for (const [j, mark] of cut.notches.entries()) {
          assert.equal(mark.edge_id, edge)
          near(mark.t, j === 0 ? .25 : .75, `${phase}/${sizes[i]} notch station`)
          near(mark.depth_m, .004, `${phase}/${sizes[i]} notch depth`)
          assert(mark.cut_start.every(Number.isFinite) && mark.inner_end.every(Number.isFinite))
          near(Math.hypot(mark.cut_start[0] - mark.inner_end[0],
            mark.cut_start[1] - mark.inner_end[1]), .004, `${phase}/${sizes[i]} cut notch depth`)
          positions.push({ size: sizes[i], t: mark.t, edge: mark.edge_id,
            cutStart: mark.cut_start, innerEnd: mark.inner_end })
        }
      }
    }
  }
  assert.equal(positions.length, 12)
  assert.notDeepEqual(positions[0].cutStart, positions[10].cutStart,
    'physical notch positions must vary across graded sizes')
  return positions
}
try {
  stage = 'author disposable source'
  await request({ op: 'open', preset: 'tshirt' })
  for (const seam of [...state.template.seams])
    await request({ op: 'edit', command: { kind: 'RemoveSeam', seam: seam.id } })
  const known = new Set(state.template.panels.map(p => p.id))
  await request({ op: 'edit', command: { kind: 'Polygon',
    fabric: state.template.fabrics[0].id,
    points: [[0, 0], [.4, 0], [.4, .32], [0, .32]] } })
  await request({ op: 'edit', command: { kind: 'Polygon',
    fabric: state.template.fabrics[0].id,
    points: [[0, 0], [.4, 0], [.4, .32], [0, .32]] } })
  const boundIds = state.template.panels.filter(p => !known.has(p.id)).map(p => p.id)
  assert.equal(boundIds.length, 2)
  const targetId = boundIds[0]
  assert(targetId, 'new native panel missing')
  const authored = (await request({ op: 'save' })).project
  for (const p of authored.template.panels)
    p.polygon.seam_allowances = Object.fromEntries(p.polygon.edges.map(edge => [edge, .01]))
  const target = panel(authored.template, targetId)
  target.polygon.notches = { [target.polygon.edges[0]]: [
    { t: .25, depth_m: .004 }, { t: .75, depth_m: .004 },
  ] }
  authored.state = null
  authored.mesh_signature = null
  await request({ op: 'open', project: authored })
  assert.deepEqual(panel(state.template, targetId).polygon.notches, target.polygon.notches)
  checks.push('Native physical source imported with complete 10mm allowances and two notches before binding')

  stage = 'store binding after attachments'
  await request({ op: 'bindings-store', nativeBindings: {
    measurements: { width: { valueMm: 400 } },
    bindings: boundIds.map((panelId, i) => ({ id: `physical_panel_width_${i}`, panelId,
      pointIndex: 1, mode: 'polar', a: 0, b: 0, angleDeg: 0,
      distanceFormula: 'width', dependsOn: [] })),
  } })
  assert.equal(state.nativePointBindings.active, true)
  const source = copy(state.template)
  const run = { schemaVersion: 1, sizes, baseSize: 'M',
    baseTemplate: copy(source), gradedTemplates: sizes.map(size => {
      const template = copy(source)
      for (const id of boundIds) panel(template, id).polygon.points[1][0] += offsets[size]
      return template
    }), pomSpecs: [] }
  await request({ op: 'grade-run-commit', gradeRun: run })
  assert.equal(state.gradeRunPersisted, true)
  const before = copy(state)
  const beforeSaved = (await request({ op: 'save' })).project
  assert.deepEqual(physicalSignature(beforeSaved.template), physicalSignature(source))
  const beforeCut = await request({ op: 'grade-run-cutlines' })
  const oldPositions = checkCut(beforeCut, beforeSaved.grade_run, targetId, 'before')
  checks.push('Six native graded CUT/STITCH packets have complete allowances and 12 physical notches before regeneration')

  stage = 'native reactive preview and commit'
  const payload = { overrides: { width: 380 } }
  const previewReply = await workspace.request({ op: 'bindings-grade-regenerate-preview',
    revision: state.revision, ...payload })
  if (!previewReply.ok) {
    assert.match(previewReply.error, /manufacturing|metadata|attachment|notch|allowance|unsupported|graph|geometry/i)
    const commitReply = await workspace.request({ op: 'bindings-grade-regenerate',
      revision: state.revision, ...payload })
    assert.equal(commitReply.ok, false, 'rejected preview cannot lead to accepted industrial commit')
    assert.equal(state.revision, before.revision)
    assert.deepEqual((await request({ op: 'save' })).project, beforeSaved)
    const invalidError = await expectRejected({
      op: 'bindings-grade-regenerate', overrides: { width: 5001 },
    })
    const staleError = await expectRejected({
      op: 'bindings-grade-regenerate', revision: before.revision + 1, ...payload,
    })
    const persisted = (await request({ op: 'save' })).project
    await request({ op: 'open', project: persisted })
    assert.equal(state.gradeRunPersisted, true)
    assert.equal(state.nativePointBindings.active, true)
    assert.deepEqual(physicalSignature(state.template), physicalSignature(source))
    const restored = (await request({ op: 'save' })).project
    checkCut(await request({ op: 'grade-run-cutlines' }), restored.grade_run, targetId, 'blocked-reopen')
    checks.push('Rejected preview/commit, invalid override and stale revision preserve authored source; save/reopen retains 12 native notches')
    blocked.push({ stage, reason: 'Real native Rust refuses reactive manufacturing attachment propagation',
      previewError: previewReply.error, commitError: commitReply.error,
      invalidError, staleError })
  } else {
    const preview = previewReply.data
    assert.equal(preview.sourceRevision, before.revision)
    assert.deepEqual(preview.bySize.map(p => p.size), sizes)
    assert.deepEqual((await request({ op: 'save' })).project, beforeSaved)
    const committed = await request({ op: 'bindings-grade-regenerate', ...payload })
    assert.equal(state.revision, before.revision + 1)
    assert.deepEqual(committed.regenerationEvidence, preview)
    const after = (await request({ op: 'save' })).project
    assert.deepEqual(physicalSignature(after.template), physicalSignature(source))
    for (let i = 0; i < sizes.length; i++) for (const id of boundIds) {
      const a = panel(after.grade_run.gradedTemplates[i], id)
      const b = panel(after.template, id)
      near(a.polygon.points[1][0] - b.polygon.points[1][0], offsets[sizes[i]], 'physical size offset')
      near(b.polygon.points[1][0], .38, 'regenerated width')
      assert.deepEqual(a.polygon.notches, panel(source, id).polygon.notches)
      assert.deepEqual(a.polygon.seam_allowances, panel(source, id).polygon.seam_allowances)
    }
    const afterCut = await request({ op: 'grade-run-cutlines' })
    const newPositions = checkCut(afterCut, after.grade_run, targetId, 'after')
    assert.notDeepEqual(newPositions, oldPositions, 'notches should move with regenerated geometry')
    const witness = verifyModarisNativeIndustrialReactiveWitness20261027({
      beforeProject: beforeSaved, afterProject: after,
      beforeCutlines: beforeCut, afterCutlines: afterCut,
      beforeRevision: before.revision, afterRevision: state.revision,
      changedPanelIds: boundIds,
    })
    assert.equal(witness.ok, true, `Independent industrial receipt witness: ${witness.reason}`)
    verifiedCommittedRevision = state.revision
    await request({ op: 'undo' })
    assert.deepEqual(state.template, before.template)
    await request({ op: 'redo' })
    assert.deepEqual(state.template, committed.template)
    const reopened = (await request({ op: 'save' })).project
    await request({ op: 'open', project: reopened })
    assert.deepEqual(checkCut(await request({ op: 'grade-run-cutlines' }),
      reopened.grade_run, targetId, 'reopened'), newPositions)
    await expectRejected({ op: 'bindings-grade-regenerate', overrides: { width: 5001 } })
    await expectRejected({ op: 'bindings-grade-regenerate', revision: before.revision, ...payload })
    const malformedRun = copy(reopened.grade_run)
    panel(malformedRun.gradedTemplates[5], targetId).polygon.notches[
      target.polygon.edges[0]][0].depth_m = .25
    const invalidMetadata = await expectRejected({ op: 'grade-run-commit', gradeRun: malformedRun })
    assert.match(invalidMetadata, /notch|allowance|depth|cut|invalid|manufacturing|factory metadata|ungraded panel/i)
    checks.push('One-revision native commit, physical notch motion, stable six-size marks, Undo/Redo, reopen and rollback')
  }
  console.log(JSON.stringify({ passed: true, nativeRust: true, disposable: true,
    industrialPropagationAccepted: blocked.length === 0, sizes, checks, blocked,
    sourceRevision: before.revision, committedRevision: verifiedCommittedRevision,
    reopenedRevision: state.revision,
    factoryApproved: false, cuttingAuthorized: false }, null, 2))
} catch (error) {
  console.log(JSON.stringify({ passed: false, nativeRust: true, disposable: true,
    stage, reason: error?.message ?? String(error), checks, blocked,
    industrialPropagationAccepted: false }, null, 2))
  process.exitCode = 1
} finally {
  workspace.close()
  fs.rmSync(root, { recursive: true, force: true })
}
