// Real compiled-Rust, disposable paired curved SEWN industrial six-size acceptance.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createWorkspace } from './workspace.mjs'

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'exo-native-curved-reactive-'))
const workspace = createWorkspace(temp)
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const offsets = [-.015, -.007, 0, .005, .010, .014]
let state, stage = 'initialization', committedRevision = null, initialRevision = null
const checks = []
const clone = structuredClone
const polygon = (template, id) => {
  const p = template.panels.find(x => x.id === id)
  assert(p?.polygon, `Missing polygon ${id}`)
  return p.polygon
}
const close = (a, b, label, eps = 1e-7) =>
  assert(Number.isFinite(a) && Math.abs(a - b) <= eps, `${label}: ${a} vs ${b}`)
const send = async value => {
  const result = await workspace.request({ revision: state?.revision, ...value })
  assert.equal(result.ok, true, `${value.op}: ${result.error ?? 'native Rust rejected'}`)
  if (result.data?.template) state = result.data
  return result.data
}
const reject = async value => {
  const before = (await send({ op: 'save' })).project
  const rev = state.revision
  const result = await workspace.request({ revision: rev, ...value })
  assert.equal(result.ok, false, `Invalid ${value.op} accepted`)
  await send({ op: 'snapshot' })
  assert.equal(state.revision, rev)
  assert.deepEqual((await send({ op: 'save' })).project, before)
  return result.error
}
const verify = (cut, industrials, project, ids, phase) => {
  assert.equal(cut.format, 'exo-native-graded-cutlines.v1')
  assert.equal(cut.manufacturerReady, false)
  assert.equal(cut.cuttingAuthorized, false)
  assert.deepEqual(cut.sizes.map(x => x.size), sizes)
  const samples = []
  for (let i = 0; i < sizes.length; i++) {
    for (let k = 0; k < ids.length; k++) {
      const id = ids[k], poly = polygon(project.grade_run.gradedTemplates[i], id)
      const edge = poly.edges[0]
      const row = cut.sizes[i].panels.find(p => p.panel_id === id)
      assert(row?.cut, `${phase}/${sizes[i]}/${id}: missing physical CUT`)
      assert.deepEqual(row.cut.edges.map(e => e.name), poly.edges)
      assert.equal(row.cut.notches.length, 2)
      assert(row.cut.edges.every(e => Math.abs(e.allowance_m - .01) < 1e-9))
      assert(row.cut.area_m2 > 0 && row.cut.perimeter_m > 0)
      const curvedLength = row.sewline_edge_lengths_m[edge]
      assert(curvedLength > Math.hypot(poly.points[1][0] - poly.points[0][0],
        poly.points[1][1] - poly.points[0][1]), 'Cubic must be physically longer than chord')
      for (let j = 0; j < 2; j++) {
        const mark = row.cut.notches[j]
        assert.equal(mark.edge_id, edge)
        close(mark.t, j === 0 ? .25 : .75, 'notch t')
        close(mark.depth_m, .004, 'notch depth')
        close(Math.hypot(mark.cut_start[0] - mark.inner_end[0],
          mark.cut_start[1] - mark.inner_end[1]), .004, 'physical notch depth')
        samples.push({ size: sizes[i], id, t: mark.t, position: mark.cut_start })
      }
      assert.equal(industrials.length, 0, 'Sewn material must not consume unsewn-only industrial audit')
    }
  }
  assert.equal(samples.length, 24)
  return samples
}
const rejectIndustrial = async ids => {
  const original = (await send({ op: 'save' })).project
  const revision = state.revision
  for (const id of ids) {
    const result = await workspace.request({ revision, op: 'grade-run-industrial-audit', panel: id })
    assert.equal(result.ok, false, 'Unsewn-only industrial audit unexpectedly accepted sewn template')
    assert.match(result.error ?? '', /Sewing attachment unsupported/)
  }
  assert.equal(state.revision, revision)
  assert.deepEqual((await send({ op: 'save' })).project, original)
}
const verifySewing = (balance, project, ids, phase) => {
  assert.equal(balance.format, 'exo-native-six-size-sewn-balance-audit.v1')
  assert.equal(balance.factoryApproved, false)
  assert.equal(balance.easeReviewRequired, false)
  assert.deepEqual(balance.sizes.map(row => row.size), sizes)
  const seam = project.template.seams.find(s => s.a.panel === ids[0] && s.b.panel === ids[1])
  assert(seam, 'Missing real native sewn pair')
  assert.equal(seam.allow_ease, false)
  assert.deepEqual(seam.notches, [[.25, .25], [.75, .75]])
  const lengths = []
  for (const row of balance.sizes) {
    const match = row.seams.find(s => s.seamId === seam.id)
    assert(match, `${phase}/${row.size}: missing audited sewn seam`)
    assert.equal(match.a.panelId, ids[0])
    assert.equal(match.b.panelId, ids[1])
    assert.equal(match.b.reversed, true)
    assert.deepEqual(match.a.interval, [0, 1])
    assert.deepEqual(match.b.interval, [0, 1])
    assert.equal(match.allowEase, false)
    assert.equal(match.requiresEaseReview, false)
    assert.equal(match.notchIntervalLengthsM.length, 3)
    close(match.a.sewnIntervalM, match.b.sewnIntervalM, `${phase}/${row.size} sewn lengths`, 1e-6)
    close(match.mismatchM, 0, `${phase}/${row.size} physical mismatch`)
    for (const pair of match.notchIntervalLengthsM)
      close(pair[0], pair[1], `${phase}/${row.size} notch interval`, 1e-6)
    assert.equal(match.a.notchPositionsM.length, 2)
    assert.equal(match.b.notchPositionsM.length, 2)
    assert.deepEqual(match.a.cubicControlsM, polygon(project.grade_run.gradedTemplates[sizes.indexOf(row.size)], ids[0]).curves[seam.a.edge])
    assert.deepEqual(match.b.cubicControlsM, polygon(project.grade_run.gradedTemplates[sizes.indexOf(row.size)], ids[1]).curves[seam.b.edge])
    lengths.push(match.a.sewnIntervalM)
  }
  return lengths
}
try {
  stage = 'author two cubic panels in Rust'
  await send({ op: 'open', preset: 'tshirt' })
  for (const seam of [...state.template.seams])
    await send({ op: 'edit', command: { kind: 'RemoveSeam', seam: seam.id } })
  const previous = new Set(state.template.panels.map(p => p.id))
  for (let i = 0; i < 2; i++)
    await send({ op: 'edit', command: { kind: 'Polygon', fabric: state.template.fabrics[0].id,
      points: [[0, 0], [.4, 0], [.4, .32], [0, .32]] } })
  const ids = state.template.panels.filter(p => !previous.has(p.id)).map(p => p.id)
  assert.equal(ids.length, 2)
  const sewRef = id => ({ panel: id, side: 'top', edge: polygon(state.template, id).edges[0], range: [0, 1] })
  await send({ op: 'edit', command: { kind: 'Sew', a: sewRef(ids[0]), b: sewRef(ids[1]), reverse: true, ease: false } })
  // Curve remains inside the positive material polygon, with no crossings.
  const project = (await send({ op: 'save' })).project
  for (const p of project.template.panels) {
    const poly = p.polygon
    poly.seam_allowances = Object.fromEntries(poly.edges.map(e => [e, .01]))
  }
  for (const id of ids) {
    const poly = polygon(project.template, id)
    poly.curves = { [poly.edges[0]]: [[.12, .03], [.28, .03]] }
    poly.notches = { [poly.edges[0]]: [
      { t: .25, depth_m: .004 }, { t: .75, depth_m: .004 },
    ] }
  }
  const sewn = project.template.seams.find(s => s.a.panel === ids[0] && s.b.panel === ids[1])
  assert(sewn, 'Compiled Sew was not persisted')
  sewn.notches = [[.25, .25], [.75, .75]]
  project.state = null
  project.mesh_signature = null
  await send({ op: 'open', project })
  assert.equal(state.template.seams.find(s => s.id === sewn.id)?.id, sewn.id)
  checks.push('Two noncrossing real cubic material polygons sewn by native Sew, complete 10mm allowances and four physical arclength notches')

  stage = 'bind after manufacturing geometry'
  await send({ op: 'bindings-store', nativeBindings: {
    measurements: { width: { valueMm: 400 } },
    bindings: ids.map((panelId, i) => ({ id: `curved_width_${i}`, panelId,
      pointIndex: 1, mode: 'polar', a: 0, b: 0, angleDeg: 0,
      distanceFormula: 'width', dependsOn: [] })),
  } })
  assert.equal(state.nativePointBindings.active, true)
  const base = clone(state.template)
  const gradeRun = { schemaVersion: 1, sizes, baseSize: 'M', baseTemplate: clone(base),
    gradedTemplates: sizes.map((size, i) => {
      const t = clone(base)
      for (const id of ids) {
        const poly = polygon(t, id)
        poly.points[1][0] += offsets[i]
        poly.curves[poly.edges[0]][0][0] += offsets[i] / 3
        poly.curves[poly.edges[0]][1][0] += offsets[i] * 2 / 3
      }
      return t
    }), pomSpecs: [] }
  await send({ op: 'grade-run-commit', gradeRun })
  assert.equal(state.gradeRunPersisted, true)
  const before = (await send({ op: 'save' })).project
  initialRevision = state.revision
  const beforeCut = await send({ op: 'grade-run-cutlines' })
  const beforeSewn = await send({ op: 'grade-run-sewing-balance-audit' })
  const beforeLengths = verifySewing(beforeSewn, before, ids, 'before')
  assert.deepEqual(beforeCut.sizes.map(row => row.size), sizes)
  for (const row of beforeCut.sizes) for (const id of ids) {
    const cut = row.panels.find(p => p.panel_id === id)?.cut
    assert(cut && cut.notches.length === 2)
    assert(cut.edges.every(e => Math.abs(e.allowance_m - .01) < 1e-9))
  }
  checks.push('Native six-size curved sewn-balance proves equal arclength intervals; physical CUT confirms 24 paired notches and 10mm allowances')
  await rejectIndustrial(ids)
  const beforePositions = verify(beforeCut, [], before, ids, 'before')
  checks.push('Actual native six-size CUT/STITCH sampling, cubic controls, 24 physical CUT notches, guarded industrial audit rejection and balanced curved sewn intervals')

  stage = 'native curved reactive preview and commit'
  const override = { overrides: { width: 380 } }
  const previewReply = await workspace.request({ revision: state.revision,
    op: 'bindings-grade-regenerate-preview', ...override })
  if (!previewReply.ok) {
    const commitReply = await workspace.request({ revision: state.revision,
      op: 'bindings-grade-regenerate', ...override })
    assert.equal(commitReply.ok, false, 'Rejected curved preview led to accepted commit')
    assert.deepEqual((await send({ op: 'save' })).project, before)
    throw Error(`BLOCKED curved native regeneration preview: ${previewReply.error}; commit: ${commitReply.error}`)
  }
  assert.deepEqual(previewReply.data.bySize.map(p => p.size), sizes)
  assert.deepEqual((await send({ op: 'save' })).project, before)
  const committed = await send({ op: 'bindings-grade-regenerate', ...override })
  committedRevision = state.revision
  assert.equal(committedRevision, initialRevision + 1)
  assert.deepEqual(committed.regenerationEvidence, previewReply.data)
  const after = (await send({ op: 'save' })).project
  const afterCut = await send({ op: 'grade-run-cutlines' })
  await rejectIndustrial(ids)
  const afterPositions = verify(afterCut, [], after, ids, 'after')
  const afterSewn = await send({ op: 'grade-run-sewing-balance-audit' })
  const afterLengths = verifySewing(afterSewn, after, ids, 'after')
  for (let i = 0; i < 6; i++) assert(Math.abs(afterLengths[i] - beforeLengths[i]) > .01, 'Curved sewn interval did not regenerate')
  assert.notDeepEqual(afterPositions, beforePositions, 'Native physical notch positions did not regenerate')
  for (let i = 0; i < 6; i++) for (const id of ids) {
    const poly = polygon(after.grade_run.gradedTemplates[i], id)
    close(poly.points[1][0], .38 + offsets[i], 'reactive size endpoint')
    const authored = polygon(after.template, id)
    close(authored.curves[poly.edges[0]][0][0], .12, 'native unchanged outgoing source cubic handle')
    close(authored.curves[poly.edges[0]][1][0], .26, 'native remapped incoming source cubic handle')
    close(poly.curves[poly.edges[0]][0][0], authored.curves[poly.edges[0]][0][0] + offsets[i] / 3, 'first endpoint blended cubic control')
    close(poly.curves[poly.edges[0]][1][0], authored.curves[poly.edges[0]][1][0] + offsets[i] * 2 / 3, 'second endpoint blended cubic control')
    assert.deepEqual(poly.notches, polygon(base, id).notches)
    assert.deepEqual(poly.seam_allowances, polygon(base, id).seam_allowances)
  }
  checks.push('Preview immutable, exactly one native commit, regenerated cubic endpoints/controls and physically moved CUT notches')

  stage = 'Undo Redo persistence and rejection rollback'
  await send({ op: 'undo' })
  assert.deepEqual(state.template, before.template)
  await send({ op: 'redo' })
  assert.deepEqual(state.template, after.template)
  const saved = (await send({ op: 'save' })).project
  await send({ op: 'open', project: saved })
  await rejectIndustrial(ids)
  assert.deepEqual(verify(await send({ op: 'grade-run-cutlines' }),
    [], saved, ids, 'reopened'), afterPositions)
  assert.deepEqual(verifySewing(await send({ op: 'grade-run-sewing-balance-audit' }), saved, ids, 'reopened'), afterLengths)
  const staleError = await reject({ op: 'bindings-grade-regenerate',
    revision: initialRevision, ...override })
  const invalidError = await reject({ op: 'bindings-grade-regenerate',
    overrides: { width: 5001 } })
  const corrupt = clone(saved.grade_run)
  polygon(corrupt.gradedTemplates[5], ids[0]).curves[
    polygon(corrupt.gradedTemplates[5], ids[0]).edges[0]][0][0] += .1
  const corruptError = await reject({ op: 'grade-run-commit', gradeRun: corrupt })
  const asymmetric = clone(saved.grade_run)
  const asymPoly = polygon(asymmetric.gradedTemplates[5], ids[1])
  asymPoly.curves[asymPoly.edges[0]][0][1] += .08
  const asymmetricError = await reject({ op: 'grade-run-commit', gradeRun: asymmetric })
  const ease = clone(saved.grade_run)
  ease.gradedTemplates[5].seams.find(s => s.id === sewn.id).allow_ease = true
  const easeError = await reject({ op: 'grade-run-commit', gradeRun: ease })
  checks.push('Undo/Redo, save/reopen and stale/invalid/corrupt curve rollback')
  console.log(JSON.stringify({ passed: true, nativeRust: true, disposable: true,
    curvedSewnIndustrialPropagationAccepted: true, sizes, panelIds: ids, sewnSeamId: sewn.id,
    physicalNotches: 24, initialRevision, committedRevision, checks,
    staleError, invalidError, corruptError, asymmetricError, easeError,
    factoryApproved: false, cuttingAuthorized: false }, null, 2))
} catch (error) {
  console.log(JSON.stringify({ passed: false, nativeRust: true, disposable: true,
    curvedSewnIndustrialPropagationAccepted: false, stage,
    reason: error?.message ?? String(error), checks, initialRevision,
    committedRevision, factoryApproved: false, cuttingAuthorized: false }, null, 2))
  process.exitCode = 1
} finally {
  workspace.close()
  fs.rmSync(temp, { recursive: true, force: true })
}
