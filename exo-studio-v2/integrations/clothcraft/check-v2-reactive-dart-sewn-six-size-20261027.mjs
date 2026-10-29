// Real disposable Rust acceptance of six-size reactive dart CUT/STITCH dependencies.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createWorkspace } from './workspace.mjs'

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'exo-reactive-dart-sewn-'))
const workspace = createWorkspace(temp)
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const offsets = [-.015, -.007, 0, .005, .010, .014]
let state, stage = 'open', baselineRevision, committedRevision
const checks = []
const copy = structuredClone
const near = (a, b, label, tolerance = 1e-7) =>
  assert(Number.isFinite(a) && Math.abs(a - b) < tolerance, `${label}: ${a} vs ${b}`)
const poly = (template, id) => {
  const p = template.panels.find(panel => panel.id === id)?.polygon
  assert(p, `Missing Rust panel ${id}`)
  return p
}
const send = async packet => {
  const result = await workspace.request({ revision: state?.revision, ...packet })
  assert.equal(result.ok, true, `${packet.op}: ${result.error ?? 'Rust rejected'}`)
  if (result.data?.template) state = result.data
  return result.data
}
const reject = async (packet, label) => {
  const original = (await send({ op: 'save' })).project
  const rev = state.revision
  const reply = await workspace.request({ revision: rev, ...packet })
  assert.equal(reply.ok, false, `${label} unexpectedly accepted`)
  await send({ op: 'snapshot' })
  assert.equal(state.revision, rev, `${label} mutated revision`)
  assert.deepEqual((await send({ op: 'save' })).project, original, `${label} mutated project`)
  return reply.error
}
const physical = async (project, dartId, otherId, seamId, label) => {
  const cut = await send({ op: 'grade-run-cutlines' })
  const sew = await send({ op: 'grade-run-sewing-balance-audit' })
  assert.equal(cut.format, 'exo-native-graded-cutlines.v1')
  assert.equal(cut.manufacturerReady, false)
  assert.equal(cut.cuttingAuthorized, false)
  assert.equal(sew.format, 'exo-native-six-size-sewn-balance-audit.v1')
  assert.equal(sew.factoryApproved, false)
  assert.deepEqual(cut.sizes.map(s => s.size), sizes)
  assert.deepEqual(sew.sizes.map(s => s.size), sizes)
  const evidence = []
  for (let i = 0; i < sizes.length; i++) {
    const graded = project.grade_run.gradedTemplates[i]
    const dart = poly(graded, dartId)
    const base = poly(project.template, dartId)
    const partner = poly(graded, otherId)
    assert.deepEqual(dart.edges, base.edges, `${label} dart stable named CUT identities`)
    assert.deepEqual(partner.edges, poly(project.template, otherId).edges)
    near(dart.points[1][0], base.points[1][0], 'Left leg shoulder x')
    near(dart.points[2][0], base.points[2][0], 'Dart apex x')
    near(dart.points[3][0], base.points[3][0], 'Right leg shoulder x')
    near(dart.points[4][0], base.points[4][0] + offsets[i], 'Graded dart outer width')
    near(partner.points[1][0], poly(project.template, otherId).points[1][0] + offsets[i], 'Graded independent width')
    const legs = [Math.hypot(...dart.points[1].map((v, j) => v - dart.points[2][j])),
      Math.hypot(...dart.points[3].map((v, j) => v - dart.points[2][j]))]
    near(legs[0], legs[1], `${label} physical dart leg balance`)
    const physicalPanels = [dartId, otherId].map(id => {
      const target = cut.sizes[i].panels.find(p => p.panel_id === id)
      assert(target?.cut, `${label}/${sizes[i]}/${id}: missing physical CUT`)
      assert.deepEqual(target.cut.edges.map(e => e.name), poly(graded, id).edges)
      assert(target.cut.edges.every(e => Math.abs(e.allowance_m - .01) < 1e-9),
        `${label}/${sizes[i]}/${id}: missing 10mm allowances`)
      return copy(target.cut)
    })
    const audit = sew.sizes[i].seams.find(s => s.seamId === seamId)
    assert(audit, `${label}/${sizes[i]} missing real dart seam in sewn audit`)
    assert.equal(audit.a.panelId, dartId)
    assert.equal(audit.b.panelId, dartId)
    assert.equal(audit.allowEase, false)
    assert.equal(audit.requiresEaseReview, false)
    near(audit.mismatchM, 0, `${label}/${sizes[i]} sewn mismatch`, 1e-6)
    near(audit.a.sewnIntervalM, audit.b.sewnIntervalM, 'Dart stitched interval', 1e-6)
    evidence.push({ size: sizes[i], legs, cut: physicalPanels, sewn: audit.a.sewnIntervalM })
  }
  return evidence
}
try {
  await send({ op: 'open', preset: 'tshirt' })
  for (const seam of [...state.template.seams])
    await send({ op: 'edit', command: { kind: 'RemoveSeam', seam: seam.id } })
  const old = new Set(state.template.panels.map(p => p.id))
  for (let i = 0; i < 2; i++)
    await send({ op: 'edit', command: { kind: 'Polygon', fabric: state.template.fabrics[0].id,
      points: [[0, 0], [.4, 0], [.4, .32], [0, .32]] } })
  const ids = state.template.panels.filter(p => !old.has(p.id)).map(p => p.id)
  assert.equal(ids.length, 2)
  const [dartId, otherId] = ids
  const sourceEdge = poly(state.template, dartId).edges[0]
  stage = 'author real DartCutSew native same-panel sewn seam'
  await send({ op: 'edit', command: { kind: 'DartCutSew', panel: dartId,
    edge: sourceEdge, left_t: .45, right_t: .55, apex: [.2, .06] } })
  const seam = state.template.seams.find(s => s.id.startsWith('dart_') &&
    s.a.panel === dartId && s.b.panel === dartId)
  assert(seam, 'Native DartCutSew did not construct paired same-panel stitch legs')
  assert.equal(seam.allow_ease, false)
  assert.equal(seam.reverse_b, true)
  const dart = poly(state.template, dartId)
  assert.equal(dart.points.length, 7)
  assert.equal(dart.edges.length, 7)
  assert.equal(seam.a.edge, dart.edges[1])
  assert.equal(seam.b.edge, dart.edges[2])
  const project = (await send({ op: 'save' })).project
  for (const panel of project.template.panels) {
    if (!panel.polygon) continue
    panel.polygon.seam_allowances = Object.fromEntries(panel.polygon.edges.map(e => [e, .01]))
  }
  project.state = null
  project.mesh_signature = null
  await send({ op: 'open', project })
  checks.push('Actual Rust DartCutSew on unsewn straight edge, seven-point same-panel sewn topology, stable leg IDs and all-edge 10mm allowances')

  stage = 'post-dart point bindings and saved six-size graded catalog'
  await send({ op: 'bindings-store', nativeBindings: {
    measurements: { width: { valueMm: 400 } },
    bindings: [{ id: 'dart_outer_width', panelId: dartId, pointIndex: 4,
      mode: 'polar', a: 0, b: 0, angleDeg: 0, distanceFormula: 'width', dependsOn: [] },
    { id: 'partner_width', panelId: otherId, pointIndex: 1,
      mode: 'polar', a: 0, b: 0, angleDeg: 0, distanceFormula: 'width', dependsOn: [] }],
  } })
  const base = copy(state.template)
  const gradeRun = { schemaVersion: 1, sizes, baseSize: 'M', baseTemplate: copy(base),
    gradedTemplates: sizes.map((size, i) => {
      const candidate = copy(base)
      poly(candidate, dartId).points[4][0] += offsets[i]
      poly(candidate, otherId).points[1][0] += offsets[i]
      return candidate
    }), pomSpecs: [] }
  await send({ op: 'grade-run-commit', gradeRun })
  const before = (await send({ op: 'save' })).project
  baselineRevision = state.revision
  stage = 'pre-edit six-size physical CUT and sewing audit'
  const pre = await physical(before, dartId, otherId, seam.id, 'before')
  checks.push('Six real graded CUT pairs and six physical no-ease paired sewn dart intervals')
  stage = 'pre-edit tamper and asymmetric rollback'
  const earlyErrors = {}
  const asymEarly = copy(before.grade_run)
  poly(asymEarly.gradedTemplates[5], dartId).points[3][1] += .02
  earlyErrors.asymmetric = await reject({ op: 'grade-run-commit', gradeRun: asymEarly }, 'asymmetric dart leg')
  const idEarly = copy(before.grade_run)
  poly(idEarly.gradedTemplates[5], dartId).edges[1] = 'forged_leg_id'
  earlyErrors.tampered = await reject({ op: 'grade-run-commit', gradeRun: idEarly }, 'tampered sewn dart identity')
  const easeEarly = copy(before.grade_run)
  easeEarly.gradedTemplates[5].seams.find(s => s.id === seam.id).allow_ease = true
  earlyErrors.ease = await reject({ op: 'grade-run-commit', gradeRun: easeEarly }, 'forged ease')
  earlyErrors.invalid = await reject({ op: 'bindings-grade-regenerate', overrides: { width: 5001 } }, 'invalid width')
  checks.push('Immutable preflight rollback of asymmetric dart leg, forged edge identity, ease and invalid dimension')
  stage = 'preview native graph dependency regeneration'
  const overrides = { overrides: { width: 380 } }
  const preview = await workspace.request({ revision: state.revision,
    op: 'bindings-grade-regenerate-preview', ...overrides })
  if (!preview.ok) {
    const commit = await workspace.request({ revision: state.revision,
      op: 'bindings-grade-regenerate', ...overrides })
    assert.equal(commit.ok, false, 'Rust preview rejected dart but commit accepted')
    assert.deepEqual((await send({ op: 'save' })).project, before)
    throw Error(`BLOCKED: Rust rejects valid no-ease dart-preserving outer-width edit. Preview: ${preview.error}; commit: ${commit.error}`)
  }
  assert.deepEqual((await send({ op: 'save' })).project, before)
  stage = 'single physical dart-preserving Rust regeneration commit'
  const committed = await send({ op: 'bindings-grade-regenerate', ...overrides })
  committedRevision = state.revision
  assert.equal(committedRevision, baselineRevision + 1)
  assert.deepEqual(committed.regenerationEvidence, preview.data)
  const after = (await send({ op: 'save' })).project
  near(poly(after.template, dartId).points[4][0], .38, 'Regenerated dart outer boundary')
  near(poly(after.template, otherId).points[1][0], .38, 'Regenerated second panel')
  const post = await physical(after, dartId, otherId, seam.id, 'after')
  assert.notDeepEqual(pre.map(s => s.cut), post.map(s => s.cut), 'Physical CUT failed to move')
  for (let i = 0; i < sizes.length; i++)
    near(pre[i].sewn, post[i].sewn, 'Dart physical leg remains equal after unrelated outer boundary edit')
  await send({ op: 'undo' })
  assert.deepEqual(state.template, before.template)
  await send({ op: 'redo' })
  assert.deepEqual(state.template, after.template)
  const saved = (await send({ op: 'save' })).project
  await send({ op: 'open', project: saved })
  assert.deepEqual(await physical(saved, dartId, otherId, seam.id, 'reopen'), post)
  checks.push('One revision, graded physical CUT relocation, stable physical no-ease dart legs, Undo/Redo/reopen')
  stage = 'reject stale invalid tampered asymmetric and ease changes'
  const errors = {}
  errors.stale = await reject({ op: 'bindings-grade-regenerate', revision: baselineRevision, ...overrides }, 'stale revision')
  errors.invalid = await reject({ op: 'bindings-grade-regenerate', overrides: { width: 5001 } }, 'invalid width')
  const asym = copy(saved.grade_run)
  poly(asym.gradedTemplates[5], dartId).points[3][1] += .02
  errors.asymmetric = await reject({ op: 'grade-run-commit', gradeRun: asym }, 'asymmetric dart leg')
  const tamper = copy(saved.grade_run)
  poly(tamper.gradedTemplates[5], dartId).edges[1] = 'forged_leg_id'
  errors.tampered = await reject({ op: 'grade-run-commit', gradeRun: tamper }, 'tampered sewn dart identity')
  const ease = copy(saved.grade_run)
  ease.gradedTemplates[5].seams.find(s => s.id === seam.id).allow_ease = true
  errors.ease = await reject({ op: 'grade-run-commit', gradeRun: ease }, 'forged ease')
  checks.push('Native transactional rollback for stale, invalid, asymmetric, forged edge ID and ease changes')
  console.log(JSON.stringify({ passed: true, nativeRust: true, manufacturerApproved: false,
    dartReactivityAccepted: true, ids, seamId: seam.id, sizes, baselineRevision,
    committedRevision, checks, errors }, null, 2))
} catch (error) {
  console.log(JSON.stringify({ passed: false, nativeRust: true, dartReactivityAccepted: false,
    manufacturerApproved: false, stage, reason: error?.message ?? String(error),
    baselineRevision, committedRevision, checks }, null, 2))
  process.exitCode = 1
} finally {
  workspace.close()
  fs.rmSync(temp, { recursive: true, force: true })
}
