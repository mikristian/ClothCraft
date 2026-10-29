// Real compiled-Rust, disposable curved industrial six-size regeneration acceptance.
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
      const audit = industrials[k]
      assert.equal(audit.format, 'exo-native-linked-industrial-six-size-proof.v1')
      assert.equal(audit.factoryApproved, false)
      assert.equal(audit.manufacturerApproved, false)
      assert.deepEqual(audit.sizes.map(s => s.size), sizes)
      const proof = audit.sizes[i].edges.find(e => e.edgeId === edge)
      assert(proof, 'Missing audited cubic edge')
      close(proof.allowanceM, .01, 'audited allowance')
      assert.deepEqual(proof.cubicControlPointsM, poly.curves[edge])
      assert.equal(proof.notches.length, 2)
      assert(proof.physicalSeamArclengthM > .35)
      for (let j = 0; j < 2; j++) {
        close(proof.notches[j].fraction, j === 0 ? .25 : .75, 'arclength fraction')
        close(proof.notches[j].seamArclengthM,
          proof.physicalSeamArclengthM * (j === 0 ? .25 : .75), 'physical arc station')
      }
    }
  }
  assert.equal(samples.length, 24)
  return samples
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
  project.state = null
  project.mesh_signature = null
  await send({ op: 'open', project })
  assert.equal(state.template.seams.length, 0)
  checks.push('Two noncrossing real cubic material polygons with complete 10mm allowances and four physical arclength notches')

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
  const beforeIndustrial = []
  for (const id of ids) beforeIndustrial.push(await send({ op: 'grade-run-industrial-audit', panel: id }))
  const beforePositions = verify(beforeCut, beforeIndustrial, before, ids, 'before')
  checks.push('Actual native six-size CUT/STITCH sampling, cubic controls, 24 physical CUT notches and industrial arclength audits')

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
  const afterIndustrial = []
  for (const id of ids) afterIndustrial.push(await send({ op: 'grade-run-industrial-audit', panel: id }))
  const afterPositions = verify(afterCut, afterIndustrial, after, ids, 'after')
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
  const reopenedIndustrial = []
  for (const id of ids) reopenedIndustrial.push(await send({ op: 'grade-run-industrial-audit', panel: id }))
  assert.deepEqual(verify(await send({ op: 'grade-run-cutlines' }),
    reopenedIndustrial, saved, ids, 'reopened'), afterPositions)
  const staleError = await reject({ op: 'bindings-grade-regenerate',
    revision: initialRevision, ...override })
  const invalidError = await reject({ op: 'bindings-grade-regenerate',
    overrides: { width: 5001 } })
  const corrupt = clone(saved.grade_run)
  polygon(corrupt.gradedTemplates[5], ids[0]).curves[
    polygon(corrupt.gradedTemplates[5], ids[0]).edges[0]][0][0] += .1
  const corruptError = await reject({ op: 'grade-run-commit', gradeRun: corrupt })
  checks.push('Undo/Redo, save/reopen and stale/invalid/corrupt curve rollback')
  console.log(JSON.stringify({ passed: true, nativeRust: true, disposable: true,
    curvedIndustrialPropagationAccepted: true, sizes, panelIds: ids,
    physicalNotches: 24, initialRevision, committedRevision, checks,
    staleError, invalidError, corruptError,
    factoryApproved: false, cuttingAuthorized: false }, null, 2))
} catch (error) {
  console.log(JSON.stringify({ passed: false, nativeRust: true, disposable: true,
    curvedIndustrialPropagationAccepted: false, stage,
    reason: error?.message ?? String(error), checks, initialRevision,
    committedRevision, factoryApproved: false, cuttingAuthorized: false }, null, 2))
  process.exitCode = 1
} finally {
  workspace.close()
  fs.rmSync(temp, { recursive: true, force: true })
}
