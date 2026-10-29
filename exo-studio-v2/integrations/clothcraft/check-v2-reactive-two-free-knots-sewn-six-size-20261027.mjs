// Independent disposable compiled-Rust acceptance of paired sewn TWO free-knot size regeneration.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createWorkspace } from './workspace.mjs'
import { verifyModarisNativeFreeKnotReactiveWitness20261027 } from '../../src/core/modarisNativeFreeKnotReactiveWitness20261027.js'

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'exo-native-two-free-knots-sewn-'))
const workspace = createWorkspace(temp)
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const offsets = [-.015, -.007, 0, .005, .010, .014]
const clone = structuredClone
const close = (a, b, what, epsilon = 1e-7) =>
  assert(Number.isFinite(a) && Math.abs(a - b) <= epsilon, `${what}: ${a} vs ${b}`)
let state, stage = 'initialization', initialRevision, committedRevision
const checks = []
const polygon = (template, id) => {
  const p = template.panels.find(panel => panel.id === id)?.polygon
  assert(p, `Native polygon missing: ${id}`)
  return p
}
const knots = (poly, id) => {
  const marks = poly.free_curve_points?.[poly.edges[0]]
  assert.equal(marks?.length, 2, `Exactly TWO authored free knots required on ${id}`)
  for (let j = 0; j < marks.length; j++) {
    assert.equal(marks[j].id, `knot_${id}_${j}`)
    close(marks[j].t, [.35, .65][j], 'Stable knot parameter', 1e-12)
  }
  assert.notEqual(marks[0].id, marks[1].id)
  return marks
}
const send = async packet => {
  const result = await workspace.request({ revision: state?.revision, ...packet })
  assert.equal(result.ok, true, `${packet.op}: ${result.error || 'Rust refused operation'}`)
  if (result.data?.template) state = result.data
  return result.data
}
const reject = async packet => {
  const project = (await send({ op: 'save' })).project
  const revision = state.revision
  const reply = await workspace.request({ revision, ...packet })
  assert.equal(reply.ok, false, `Invalid ${packet.op} was accepted: ${packet.validationName ?? 'unnamed'}`)
  await send({ op: 'snapshot' })
  assert.equal(state.revision, revision, 'Rejected request changed native revision')
  assert.deepEqual((await send({ op: 'save' })).project, project,
    'Rejected request changed saved native Rust project')
  return reply.error
}
const verifyGrade = (project, ids, phase) => {
  const run = project.grade_run
  assert.deepEqual(run.sizes, sizes)
  assert.equal(run.baseSize ?? run.base_size, 'M')
  for (let i = 0; i < sizes.length; i++) {
    for (const id of ids) {
      const source = polygon(project.template, id)
      const graded = polygon(run.gradedTemplates[i], id)
      const originalKnots = knots(source, id)
      const gradedKnots = knots(graded, id)
      const dx0 = graded.points[0][0] - source.points[0][0]
      const dy0 = graded.points[0][1] - source.points[0][1]
      const dx1 = graded.points[1][0] - source.points[1][0]
      const dy1 = graded.points[1][1] - source.points[1][1]
      close(graded.points[1][0], source.points[1][0] + offsets[i],
        `${phase}/${sizes[i]}/${id} endpoint`)
      for (let j = 0; j < originalKnots.length; j++) {
        const a = originalKnots[j], b = gradedKnots[j]
        close(b.position[0], a.position[0] + dx0 * (1 - a.t) + dx1 * a.t,
          `${phase}/${sizes[i]}/${id}/${j} knot x`)
        close(b.position[1], a.position[1] + dy0 * (1 - a.t) + dy1 * a.t,
          `${phase}/${sizes[i]}/${id}/${j} knot y`)
        for (const key of ['derivative', 'derivative_in', 'derivative_out']) {
          if (a[key] == null) {
            assert.equal(b[key], undefined, `${phase}/${sizes[i]}/${id}/${j} unexpected ${key}`)
          } else {
            assert.equal(b[key]?.length, 2, `${phase}/${sizes[i]}/${id}/${j} missing ${key}`)
            close(b[key][0], a[key][0] + dx1 - dx0, `${phase}/${sizes[i]}/${id}/${j} ${key} x`)
            close(b[key][1], a[key][1] + dy1 - dy0, `${phase}/${sizes[i]}/${id}/${j} ${key} y`)
          }
        }
        assert.deepEqual(b.mirror_group, a.mirror_group)
      }
      assert.deepEqual(graded.notches, source.notches)
      assert.deepEqual(graded.seam_allowances, source.seam_allowances)
    }
  }
}
const verifyCut = (cut, project, ids, phase) => {
  assert.equal(cut.format, 'exo-native-graded-cutlines.v1')
  assert.equal(cut.manufacturerReady, false)
  assert.equal(cut.cuttingAuthorized, false)
  assert.deepEqual(cut.sizes.map(row => row.size), sizes)
  const positions = []
  for (let i = 0; i < sizes.length; i++) for (const id of ids) {
    const poly = polygon(project.grade_run.gradedTemplates[i], id)
    const row = cut.sizes[i].panels.find(panel => panel.panel_id === id)
    assert(row?.cut, `${phase}/${sizes[i]}/${id}: absent physical CUT`)
    assert.deepEqual(row.cut.edges.map(edge => edge.name), poly.edges)
    assert(row.cut.area_m2 > 0 && row.cut.perimeter_m > 0)
    assert(row.cut.edges.every(edge => Math.abs(edge.allowance_m - .01) < 1e-9))
    assert.equal(row.cut.notches.length, 2)
    const chord = Math.hypot(poly.points[1][0] - poly.points[0][0],
      poly.points[1][1] - poly.points[0][1])
    assert(row.sewline_edge_lengths_m[poly.edges[0]] > chord + 1e-6,
      `${phase}/${sizes[i]}/${id}: free-knot stitch length not curved`)
    for (let index = 0; index < 2; index++) {
      const mark = row.cut.notches[index]
      assert.equal(mark.edge_id, poly.edges[0])
      close(mark.t, [.25, .75][index], 'Physical notch arclength fraction')
      close(mark.depth_m, .004, 'Physical notch depth')
      close(Math.hypot(mark.cut_start[0] - mark.inner_end[0],
        mark.cut_start[1] - mark.inner_end[1]), .004, 'Physical cut notch length')
      positions.push({ size: sizes[i], panelId: id, t: mark.t,
        cutStart: mark.cut_start, innerEnd: mark.inner_end })
    }
  }
  assert.equal(positions.length, 24)
  return positions
}
const verifySew = (audit, project, ids, phase) => {
  assert.equal(audit.format, 'exo-native-six-size-sewn-balance-audit.v1')
  assert.equal(audit.factoryApproved, false)
  assert.equal(audit.easeReviewRequired, false)
  assert.deepEqual(audit.sizes.map(row => row.size), sizes)
  const sewn = project.template.seams.find(seam =>
    seam.a.panel === ids[0] && seam.b.panel === ids[1])
  assert(sewn, 'Authored native Sew missing')
  assert.equal(sewn.allow_ease, false)
  assert.deepEqual(sewn.notches, [[.25, .25], [.75, .75]])
  const lengths = []
  for (let i = 0; i < sizes.length; i++) {
    const match = audit.sizes[i].seams.find(seam => seam.seamId === sewn.id)
    assert(match, `${phase}/${sizes[i]}: missing native sewn evidence`)
    assert.equal(match.a.panelId, ids[0])
    assert.equal(match.b.panelId, ids[1])
    assert.equal(match.b.reversed, true)
    assert.deepEqual(match.a.interval, [0, 1])
    assert.deepEqual(match.b.interval, [0, 1])
    assert.equal(match.allowEase, false)
    assert.equal(match.requiresEaseReview, false)
    close(match.mismatchM, 0, `${phase}/${sizes[i]} mismatch`)
    close(match.a.sewnIntervalM, match.b.sewnIntervalM,
      `${phase}/${sizes[i]} sewn lengths`, 1e-6)
    assert.equal(match.notchIntervalLengthsM.length, 3)
    for (const interval of match.notchIntervalLengthsM)
      close(interval[0], interval[1], `${phase}/${sizes[i]} notch interval`, 1e-6)
    assert.equal(match.a.notchPositionsM.length, 2)
    assert.equal(match.b.notchPositionsM.length, 2)
    lengths.push(match.a.sewnIntervalM)
  }
  return lengths
}
const rejectIndustrial = async ids => {
  const before = (await send({ op: 'save' })).project
  const revision = state.revision
  for (const panel of ids) {
    const reply = await workspace.request({ revision, op: 'grade-run-industrial-audit', panel })
    assert.equal(reply.ok, false, 'Unsewn-only industrial audit accepted sewn project')
    assert.match(reply.error ?? '', /Sewing attachment unsupported/)
  }
  assert.equal(state.revision, revision)
  assert.deepEqual((await send({ op: 'save' })).project, before)
}
try {
  stage = 'author paired physical Rust sewn polygons and free knots'
  await send({ op: 'open', preset: 'tshirt' })
  for (const seam of [...state.template.seams])
    await send({ op: 'edit', command: { kind: 'RemoveSeam', seam: seam.id } })
  const old = new Set(state.template.panels.map(panel => panel.id))
  for (let n = 0; n < 2; n++)
    await send({ op: 'edit', command: { kind: 'Polygon',
      fabric: state.template.fabrics[0].id,
      points: [[0, 0], [.4, 0], [.4, .32], [0, .32]] } })
  const ids = state.template.panels.filter(panel => !old.has(panel.id)).map(panel => panel.id)
  assert.equal(ids.length, 2)
  const ref = id => ({ panel: id, side: 'top',
    edge: polygon(state.template, id).edges[0], range: [0, 1] })
  await send({ op: 'edit', command: { kind: 'Sew',
    a: ref(ids[0]), b: ref(ids[1]), reverse: true, ease: false } })
  const project = (await send({ op: 'save' })).project
  // CUT audits cover the entire template, including the untouched preset panels.
  for (const panel of project.template.panels) {
    if (!panel.polygon) continue
    panel.polygon.seam_allowances = Object.fromEntries(
      panel.polygon.edges.map(name => [name, .01]))
  }
  for (const id of ids) {
    const poly = polygon(project.template, id)
    const edge = poly.edges[0]
    poly.curves = { [edge]: [[.12, .03], [.28, .03]] }
    poly.free_curve_points = { [edge]: [
      { id: `knot_${id}_0`, t: .35, position: [.14, .03],
        derivative: [.4, 0], derivative_in: [.4, .012], derivative_out: [.4, -.012] },
      { id: `knot_${id}_1`, t: .65, position: [.26, .03],
        derivative: [.4, 0], derivative_in: [.4, -.008], derivative_out: [.4, .008] },
    ] }
    poly.seam_allowances = Object.fromEntries(poly.edges.map(name => [name, .01]))
    poly.notches = { [edge]: [{ t: .25, depth_m: .004 }, { t: .75, depth_m: .004 }] }
  }
  const seam = project.template.seams.find(item =>
    item.a.panel === ids[0] && item.b.panel === ids[1])
  assert(seam, 'Real native Sew seam missing from save')
  seam.notches = [[.25, .25], [.75, .75]]
  project.state = null
  project.mesh_signature = null
  await send({ op: 'open', project })
  for (const id of ids) {
    const stored = polygon(state.template, id)
    const [first, second] = knots(stored, id)
    assert.deepEqual(first.position, [.14, .03])
    assert.deepEqual(first.derivative_in, [.4, .012])
    assert.deepEqual(first.derivative_out, [.4, -.012])
    assert.deepEqual(second.position, [.26, .03])
    assert.deepEqual(second.derivative_in, [.4, -.008])
    assert.deepEqual(second.derivative_out, [.4, .008])
  }
  checks.push('Native two-panel 400x320mm cubic sewn topology, TWO ordered unique-ID authored knots per edge, independent in/out tangents, paired arclength notches and complete allowances')

  stage = 'save post-attachment bindings and graded physical knot catalog'
  await send({ op: 'bindings-store', nativeBindings: {
    measurements: { width: { valueMm: 400 } },
    bindings: ids.map((panelId, i) => ({ id: `free_knot_width_${i}`,
      panelId, pointIndex: 1, mode: 'polar', a: 0, b: 0, angleDeg: 0,
      distanceFormula: 'width', dependsOn: [] })),
  } })
  assert.equal(state.nativePointBindings.active, true)
  const base = clone(state.template)
  const gradeRun = { schemaVersion: 1, sizes, baseSize: 'M',
    baseTemplate: clone(base),
    gradedTemplates: sizes.map((size, i) => {
      const template = clone(base)
      for (const id of ids) {
        const poly = polygon(template, id), edge = poly.edges[0]
        const delta = offsets[i]
        poly.points[1][0] += delta
        poly.curves[edge][0][0] += delta / 3
        poly.curves[edge][1][0] += delta * 2 / 3
        for (const mark of knots(poly, id)) {
          mark.position[0] += delta * mark.t
          for (const key of ['derivative', 'derivative_in', 'derivative_out'])
            if (mark[key]) mark[key][0] += delta
        }
      }
      return template
    }), pomSpecs: [] }
  await send({ op: 'grade-run-commit', gradeRun })
  assert.equal(state.gradeRunPersisted, true)
  const before = (await send({ op: 'save' })).project
  verifyGrade(before, ids, 'before')
  initialRevision = state.revision

  stage = 'pre-edit native six-size CUT and sewn balance'
  const beforeCut = await send({ op: 'grade-run-cutlines' })
  const beforePositions = verifyCut(beforeCut, before, ids, 'before')
  const beforeSew = await send({ op: 'grade-run-sewing-balance-audit' })
  const beforeLengths = verifySew(beforeSew, before, ids, 'before')
  await rejectIndustrial(ids)
  checks.push('Physical six-size native CUT/STITCH receipt, 24 arclength notches and balanced paired no-ease sewn intervals')

  stage = 'preview and commit native knot dependency regeneration'
  const overrides = { overrides: { width: 380 } }
  const previewReply = await workspace.request({ revision: state.revision,
    op: 'bindings-grade-regenerate-preview', ...overrides })
  if (!previewReply.ok) {
    const commitReply = await workspace.request({ revision: state.revision,
      op: 'bindings-grade-regenerate', ...overrides })
    assert.equal(commitReply.ok, false, 'Preview rejected free knot while commit accepted')
    assert.deepEqual((await send({ op: 'save' })).project, before)
    throw Error(`BLOCKED native free-knot regeneration preview: ${previewReply.error}; commit: ${commitReply.error}`)
  }
  assert.deepEqual(previewReply.data.bySize.map(row => row.size), sizes)
  assert.deepEqual((await send({ op: 'save' })).project, before)
  const committed = await send({ op: 'bindings-grade-regenerate', ...overrides })
  committedRevision = state.revision
  assert.equal(committedRevision, initialRevision + 1)
  assert.deepEqual(committed.regenerationEvidence, previewReply.data)
  const after = (await send({ op: 'save' })).project
  for (const id of ids) {
    const [first, second] = knots(polygon(after.template, id), id)
    close(first.position[0], .133, 'Recomputed authored first free knot x')
    close(second.position[0], .247, 'Recomputed authored second free knot x')
    assert.deepEqual(first.derivative_in, [.38, .012])
    assert.deepEqual(first.derivative_out, [.38, -.012])
    assert.deepEqual(second.derivative_in, [.38, -.008])
    assert.deepEqual(second.derivative_out, [.38, .008])
  }
  verifyGrade(after, ids, 'after')
  const afterCut = await send({ op: 'grade-run-cutlines' })
  const afterPositions = verifyCut(afterCut, after, ids, 'after')
  assert.notDeepEqual(afterPositions, beforePositions, 'Free knot failed to move physical CUT notches')
  const afterSew = await send({ op: 'grade-run-sewing-balance-audit' })
  const afterLengths = verifySew(afterSew, after, ids, 'after')
  const independent = verifyModarisNativeFreeKnotReactiveWitness20261027({
    beforeProject: before, afterProject: after, beforeCutlines: beforeCut,
    afterCutlines: afterCut, beforeSewing: beforeSew, afterSewing: afterSew,
    beforeRevision: initialRevision, afterRevision: committedRevision,
    changedPanelIds: ids,
  })
  assert.equal(independent.ok, true,
    `Independent physical free-knot witness failed: ${independent.reason ?? 'unknown'}`)
  assert.equal(independent.nativeFreeKnotPropagationAccepted, true)
  assert.equal(independent.verifiedPhysicalCutPanels, 12)
  assert.equal(independent.verifiedFreeKnotReferences, 24)
  assert.equal(independent.verifiedPhysicalNotches, 24)
  for (let i = 0; i < sizes.length; i++)
    assert(Math.abs(beforeLengths[i] - afterLengths[i]) > .01,
      `Size ${sizes[i]} physical sewn interval did not regenerate`)
  await rejectIndustrial(ids)
  checks.push('Immutable native preview, single native commit, graded knot positions/tangents, 24 physically moved CUT notches and balanced sewn arclength')
  checks.push('Independent Hermite sampling and saved native physical CUT/sewing witness accepts 12 graded panels, 24 stable free knots and 24 notches')

  stage = 'Undo Redo save/reopen and malformed mutation rollback'
  await send({ op: 'undo' })
  assert.deepEqual(state.template, before.template)
  await send({ op: 'redo' })
  assert.deepEqual(state.template, after.template)
  const saved = (await send({ op: 'save' })).project
  await send({ op: 'open', project: saved })
  assert.deepEqual(verifyCut(await send({ op: 'grade-run-cutlines' }),
    saved, ids, 'reopened'), afterPositions)
  assert.deepEqual(verifySew(await send({ op: 'grade-run-sewing-balance-audit' }),
    saved, ids, 'reopened'), afterLengths)
  await rejectIndustrial(ids)
  const staleError = await reject({ op: 'bindings-grade-regenerate',
    revision: initialRevision, ...overrides })
  const invalidError = await reject({ op: 'bindings-grade-regenerate',
    overrides: { width: 5001 } })
  const forged = clone(saved.grade_run)
  const forgedKnot = knots(polygon(forged.gradedTemplates[5], ids[0]), ids[0])[1]
  forgedKnot.position[0] += .03
  const corruptError = await reject({ op: 'grade-run-commit', validationName: 'forged knot position', gradeRun: forged })
  const derivativeForge = clone(saved.grade_run)
  knots(polygon(derivativeForge.gradedTemplates[5], ids[0]), ids[0])[0].derivative_in[1] += .06
  const derivativeError = await reject({ op: 'grade-run-commit', validationName: 'forged knot derivative', gradeRun: derivativeForge })
  const swapped = clone(saved.grade_run)
  const swappedPoints = polygon(swapped.gradedTemplates[5], ids[0]).free_curve_points
  const swappedEdge = polygon(swapped.gradedTemplates[5], ids[0]).edges[0]
  swappedPoints[swappedEdge].reverse()
  const orderError = await reject({ op: 'grade-run-commit', validationName: 'swapped knot ordering', gradeRun: swapped })
  const forgedIdentity = clone(saved.grade_run)
  const forgedIds = polygon(forgedIdentity.gradedTemplates[5], ids[0])
  forgedIds.free_curve_points[forgedIds.edges[0]][1].id = 'forged_knot_id'
  const identityError = await reject({ op: 'grade-run-commit', validationName: 'forged knot identity', gradeRun: forgedIdentity })
  const asymmetric = clone(saved.grade_run)
  knots(polygon(asymmetric.gradedTemplates[5], ids[1]), ids[1])[1].position[1] += .08
  const asymmetricError = await reject({ op: 'grade-run-commit', validationName: 'asymmetric sewn knot', gradeRun: asymmetric })
  const ease = clone(saved.grade_run)
  ease.gradedTemplates[5].seams.find(item => item.id === seam.id).allow_ease = true
  const easeError = await reject({ op: 'grade-run-commit', validationName: 'forged sewing ease', gradeRun: ease })
  checks.push('Native Undo/Redo/save/reopen plus stale, invalid, knot-position, tangent, reversed order, forged ID, asymmetry, and ease rollback')
  console.log(JSON.stringify({ passed: true, nativeRust: true, disposable: true,
    freeKnotSewnIndustrialPropagationAccepted: true, freeKnotsPerPanel: 2, sizes, panelIds: ids,
    seamId: seam.id, physicalNotches: 24, initialRevision, committedRevision, checks,
    independentPhysicalWitness: independent,
    staleError, invalidError, corruptError, derivativeError, orderError, identityError,
    asymmetricError, easeError,
    manufacturerApproved: false, cuttingAuthorized: false }, null, 2))
} catch (error) {
  console.log(JSON.stringify({ passed: false, nativeRust: true, disposable: true,
    freeKnotSewnIndustrialPropagationAccepted: false, stage,
    reason: error?.message ?? String(error), checks, initialRevision,
    committedRevision, manufacturerApproved: false, cuttingAuthorized: false }, null, 2))
  process.exitCode = 1
} finally {
  workspace.close()
  fs.rmSync(temp, { recursive: true, force: true })
}
