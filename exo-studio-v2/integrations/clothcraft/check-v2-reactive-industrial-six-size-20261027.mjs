// Independent real Rust industrial acceptance. All garment mutations occur in
// one disposable temporary workspace; industrial unsupported cases are blocked.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createWorkspace } from './workspace.mjs'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'exo-industrial-reactive-real-rust-'))
const workspace = createWorkspace(root)
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const offsets = { XS: -.015, S: -.007, M: 0, L: .005, XL: .010, XXL: .014 }
const close = (actual, expected, label) => assert(Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-8, `${label}: ${actual} != ${expected}`)
const physical = panel => ({ id: panel.id, edges: panel.polygon.edges, points: panel.polygon.points,
  allowances: panel.polygon.seam_allowances ?? {}, notches: panel.polygon.notches ?? {} })
let snapshot
const checks = [], blocked = [], observations = []
const send = async request => {
  const response = await workspace.request({ revision: snapshot?.revision, ...request })
  assert.equal(response.ok, true, `${request.op}: ${response.error ?? 'Rust rejected request'}`)
  if (response.data?.template) snapshot = response.data
  return response.data
}
const deny = async (request, reason) => {
  const prior = structuredClone(snapshot)
  const before = (await send({ op: 'save' })).project
  const response = await workspace.request({ revision: prior.revision, ...request })
  assert.equal(response.ok, false, `${request.op} must fail closed for ${reason}`)
  await send({ op: 'snapshot' })
  assert.equal(snapshot.revision, prior.revision)
  assert.deepEqual(snapshot.template, prior.template)
  assert.deepEqual(snapshot.nativePointBindings, prior.nativePointBindings)
  assert.deepEqual((await send({ op: 'save' })).project, before, 'Rejected native operation must preserve saved grade catalog')
  blocked.push({ request: request.op, reason, nativeError: response.error })
}
try {
  await send({ op: 'open', preset: 'tshirt' })
  for (const seam of [...snapshot.template.seams]) await send({ op: 'edit', command: { kind: 'RemoveSeam', seam: seam.id } })
  const initial = new Set(snapshot.template.panels.map(panel => panel.id))
  const fabric = snapshot.template.fabrics[0].id
  for (let i = 0; i < 2; i++) await send({ op: 'edit', command: { kind: 'Polygon', fabric, points: [[0, 0], [.4, 0], [.4, .32], [0, .32]] } })
  const panelIds = snapshot.template.panels.filter(panel => !initial.has(panel.id)).map(panel => panel.id)
  assert.equal(panelIds.length, 2)
  const nativeBindings = { measurements: { sharedWidth: { valueMm: 400 } }, bindings: panelIds.map((panelId, i) => ({
    id: `industrial_width_${i}`, panelId, pointIndex: 1, mode: 'polar', a: 0, b: 0,
    angleDeg: 0, distanceFormula: 'sharedWidth', dependsOn: [],
  })) }
  await send({ op: 'bindings-store', nativeBindings })
  assert.equal(snapshot.nativePointBindings.active, true)
  const source = structuredClone(snapshot.template)
  // Baseline CUT proof is separate from the reactive catalog: adding any
  // allowances to a bound panel before recomputation would be unsupported.
  // We can nevertheless exercise real Rust cutline geometry on a disposable
  // second catalog after the one native reactive commit is safely complete.
  // A complete physical CUT needs an explicitly authored allowance for EVERY
  // polygon edge, including pre-existing preset pieces and the detached ones.
  // Add them only to the disposable grade snapshots: Rust recompute rejects
  // manufacturing metadata on bound source panels, so base remains clean.
  const widthTargets = Object.fromEntries(sizes.map(size => [size, (400 + offsets[size] * 1000)]))
  const gradeRun = { schemaVersion: 1, sizes, baseSize: 'M', baseTemplate: source,
    gradedTemplates: sizes.map(size => {
      const template = structuredClone(source)
      for (const panel of template.panels) if (panelIds.includes(panel.id)) panel.polygon.points[1][0] += offsets[size]
      return template
    }), pomSpecs: [{ id: 'industrial-width-pom', label: 'Detached graded width',
      panelId: panelIds[0], kind: 'anchor-distance', fromPoint: 0, toPoint: 1,
      toleranceMm: .25, targetsMm: widthTargets }] }
  await send({ op: 'grade-run-commit', gradeRun })
  assert.equal(snapshot.gradeRunPersisted, true)
  const statusBefore = await send({ op: 'grade-run-status' })
  assert.equal(statusBefore.persistedInProject, true)
  assert.deepEqual(statusBefore.catalog.sizes, sizes)
  const cutBeforeReply = await workspace.request({ op: 'grade-run-cutlines', revision: snapshot.revision })
  if (cutBeforeReply.ok) {
    assert.equal(cutBeforeReply.data.format, 'exo-native-graded-cutlines.v1')
    assert.deepEqual(cutBeforeReply.data.sizes.map(row => row.size), sizes)
    assert.equal(cutBeforeReply.data.manufacturerReady, false)
    assert.equal(cutBeforeReply.data.cuttingAuthorized, false)
  } else {
    assert.match(cutBeforeReply.error, /seam allowance|cut|manufacturing/i)
    blocked.push({ request: 'grade-run-cutlines before regeneration',
      reason: 'Native template does not supply complete physical seam allowances', nativeError: cutBeforeReply.error })
  }
  const pomBeforeReply = await workspace.request({ op: 'grade-run-pom-audit', revision: snapshot.revision })
  if (pomBeforeReply.ok) {
    assert.equal(pomBeforeReply.data.format, 'exo-native-grade-pom-audit.v1')
    assert.equal(pomBeforeReply.data.factoryApproved, false)
  } else {
    assert.match(pomBeforeReply.error, /POM|specification|audit/i)
    blocked.push({ request: 'grade-run-pom-audit before regeneration',
      reason: 'No authored per-size point-of-measure specification exists', nativeError: pomBeforeReply.error })
  }
  checks.push('Original six-size Rust CUT request, saved catalog and POM audit inspected without factory release')

  const prior = structuredClone(snapshot)
  const payload = { overrides: { sharedWidth: 380 } }
  const preview = await send({ op: 'bindings-grade-regenerate-preview', ...payload })
  assert.equal(preview.format, 'exo-native-reactive-size-run.v1')
  assert.equal(preview.sourceRevision, prior.revision)
  assert.deepEqual(preview.bySize.map(row => row.size), sizes)
  assert(preview.bySize.every(row => row.changes.length === 2))
  assert.equal(preview.factoryApproved, false)
  assert.equal(snapshot.revision, prior.revision)
  assert.deepEqual(snapshot.template, prior.template)
  checks.push('Preview returns exactly six physical source-dependent size reports and leaves source revision and geometry untouched')
  const committed = await send({ op: 'bindings-grade-regenerate', ...payload })
  assert.equal(snapshot.revision, prior.revision + 1)
  assert.deepEqual(committed.regenerationEvidence, preview)
  assert.equal(snapshot.nativePointBindings.measurements.sharedWidth.valueMm, 380)
  const persisted = (await send({ op: 'save' })).project
  assert.deepEqual(persisted.grade_run.sizes, sizes)
  assert.equal(persisted.grade_run.gradedTemplates.length, 6)
  const statusAfter = await send({ op: 'grade-run-status' })
  assert.equal(statusAfter.persistedInProject, true)
  assert.deepEqual(statusAfter.catalog, persisted.grade_run)
  const cutAfterReply = await workspace.request({ op: 'grade-run-cutlines', revision: snapshot.revision })
  const cutAfter = cutAfterReply.ok ? cutAfterReply.data : null
  if (cutAfter) {
    assert.equal(cutAfter.sourceRevision, snapshot.revision)
    assert.deepEqual(cutAfter.sizes.map(row => row.size), sizes)
    assert.equal(cutAfter.manufacturerReady, false)
    assert.equal(cutAfter.cuttingAuthorized, false)
    assert.deepEqual(await send({ op: 'grade-run-cutlines' }), cutAfter, 'Native CUT packet must be deterministic')
  } else {
    assert.match(cutAfterReply.error, /seam allowance|cut|manufacturing/i)
    blocked.push({ request: 'grade-run-cutlines after regeneration',
      reason: 'Native CUT/STITCH acceptance is blocked by missing authored seam allowance metadata', nativeError: cutAfterReply.error })
  }
  const pomAfterReply = await workspace.request({ op: 'grade-run-pom-audit', revision: snapshot.revision })
  if (pomAfterReply.ok) {
    assert.equal(pomAfterReply.data.sourceRevision, snapshot.revision)
    assert.equal(pomAfterReply.data.factoryApproved, false)
  } else {
    assert.match(pomAfterReply.error, /POM|specification|audit/i)
    blocked.push({ request: 'grade-run-pom-audit after regeneration',
      reason: 'Rust grade catalog lacks explicit measurable POM targets', nativeError: pomAfterReply.error })
  }
  for (let index = 0; index < sizes.length; index++) {
    const size = sizes[index], template = persisted.grade_run.gradedTemplates[index]
    assert.deepEqual(template.panels.map(p => p.id), source.panels.map(p => p.id))
    const packet = cutAfter?.sizes[index]
    if (packet) assert.equal(packet.panels.length, template.panels.length)
    for (const authored of template.panels) {
      const original = source.panels.find(p => p.id === authored.id)
      assert(original)
      assert.deepEqual(authored.polygon.edges, original.polygon.edges, `${size} stable authored edge identities`)
      const nativePanel = packet?.panels.find(p => p.panel_id === authored.id)
      if (cutAfter) {
        assert(nativePanel && nativePanel.cut)
        assert.deepEqual(nativePanel.cut.edges.map(e => e.name), authored.polygon.edges)
        assert(nativePanel.cut.points.length >= authored.polygon.points.length)
        assert(nativePanel.cut.area_m2 > 0 && Number.isFinite(nativePanel.cut.area_m2))
        assert(nativePanel.cut.perimeter_m > 0 && Number.isFinite(nativePanel.cut.perimeter_m))
      }
      if (panelIds.includes(authored.id)) {
        const basePanel = persisted.template.panels.find(p => p.id === authored.id)
        close(authored.polygon.points[1][0] - basePanel.polygon.points[1][0], offsets[size], `${size}/${authored.id} grade offset`)
        close(basePanel.polygon.points[1][0], .38, `${size}/${authored.id} regenerated width`)
      } else assert.deepEqual(physical(authored), physical(original), `${size}/${authored.id} unrelated authored geometry`)
      if (nativePanel) {
        assert.deepEqual(nativePanel.cut.notches, [], `${size}/${authored.id} no invented native notches`)
        observations.push({ size, panelId: authored.id, cutAreaM2: nativePanel.cut.area_m2,
          stitchEdges: Object.keys(nativePanel.sewline_edge_lengths_m), notches: nativePanel.cut.notches.length })
      }
    }
  }
  checks.push('Committed one Rust revision, persisted exactly six grades and verified stable authored panel/edge identities, offsets and unaffected pieces')
  assert.deepEqual((await send({ op: 'save' })).project, persisted, 'All Rust read-only inspections must preserve garment')
  await deny({ op: 'grade-run-cutlines', revision: snapshot.revision + 1 }, 'stale CUT revision')
  await deny({ op: 'grade-run-pom-audit', revision: snapshot.revision + 1 }, 'stale POM revision')
  const reloaded = (await send({ op: 'save' })).project
  await send({ op: 'open', project: reloaded })
  assert.equal(snapshot.gradeRunPersisted, true)
  assert.equal(snapshot.nativePointBindings.active, true)
  assert.deepEqual((await send({ op: 'grade-run-status' })).catalog, reloaded.grade_run)
  checks.push('Rust save/reopen retains the native six-size grade catalog and source bindings')

  // Inspect actual native CUT/STITCH on an independently authored complete
  // allowance catalog. This is NOT evidence reactive propagation works; the
  // catalog must be committed on this disposable copy after regeneration.
  const cutReadyRun = structuredClone(reloaded.grade_run)
  for (const template of [cutReadyRun.baseTemplate, ...cutReadyRun.gradedTemplates]) {
    for (const panel of template.panels) {
      panel.polygon.seam_allowances = Object.fromEntries(panel.polygon.edges.map(edge => [edge, .01]))
    }
  }
  const cutBase = structuredClone(reloaded)
  cutBase.state = null
  cutBase.mesh_signature = null
  for (const panel of cutBase.template.panels) {
    panel.polygon.seam_allowances = Object.fromEntries(panel.polygon.edges.map(edge => [edge, .01]))
  }
  cutBase.grade_run = cutReadyRun
  const cutImport = await workspace.request({ op: 'open', project: cutBase, revision: snapshot.revision })
  if (cutImport.ok) {
    snapshot = cutImport.data
    const physicallyAuthored = await workspace.request({ op: 'grade-run-cutlines', revision: snapshot.revision })
    if (physicallyAuthored.ok) {
      const packet = physicallyAuthored.data
      assert.deepEqual(packet.sizes.map(row => row.size), sizes)
      assert.equal(packet.manufacturerReady, false)
      assert.equal(packet.cuttingAuthorized, false)
      for (let i = 0; i < sizes.length; i++) {
        const row = packet.sizes[i]
        assert.equal(row.panels.length, cutReadyRun.gradedTemplates[i].panels.length)
        for (const record of row.panels) {
          const authored = cutReadyRun.gradedTemplates[i].panels.find(p => p.id === record.panel_id)
          assert(authored)
          assert.deepEqual(record.cut.edges.map(e => e.name), authored.polygon.edges)
          assert(record.cut.edges.every(edge => Math.abs(edge.allowance_m - .01) < 1e-8))
          assert(record.cut.area_m2 > 0 && Number.isFinite(record.cut.area_m2))
          assert(record.cut.perimeter_m > 0 && Number.isFinite(record.cut.perimeter_m))
          for (const edge of authored.polygon.edges) assert(Number.isFinite(record.sewline_edge_lengths_m[edge]))
          observations.push({ size: sizes[i], panelId: record.panel_id, cutAreaM2: record.cut.area_m2,
            stitchEdges: Object.keys(record.sewline_edge_lengths_m), notches: record.cut.notches.length })
        }
      }
      checks.push('Independently authored complete-allowance six-size Rust CUT/STITCH geometry is numerically inspected after reactive source regeneration')
    } else blocked.push({ request: 'grade-run-cutlines with all authored allowances',
      reason: 'Rust refused a complete-allowance independently authored grade catalog', nativeError: physicallyAuthored.error })
  } else blocked.push({ request: 'open complete-allowance six-size grade catalog',
    reason: 'Native validation refused a complete-allowance catalog before CUT inspection', nativeError: cutImport.error })
  // Restore the verified plain source before challenging manufacturing links.
  await send({ op: 'open', project: reloaded })

  // This deliberately injects real Rust manufacturing data into a disposable
  // *clone* and proves the reactive path refuses instead of claiming to update
  // CUT/STITCH/allowance/notch attachment geometry through the grade graph.
  const industrial = structuredClone(reloaded)
  industrial.state = null
  industrial.mesh_signature = null
  for (const template of [industrial.template, industrial.grade_run.baseTemplate, ...industrial.grade_run.gradedTemplates]) {
    const panel = template.panels.find(p => p.id === panelIds[0])
    const edge = panel.polygon.edges[0]
    panel.polygon.seam_allowances = { [edge]: .01 }
    panel.polygon.notches = { [edge]: [{ t: .25, depth_m: .004 }] }
  }
  let imported = false
  const beforeIndustrial = structuredClone(snapshot)
  const result = await workspace.request({ op: 'open', project: industrial, revision: snapshot.revision })
  if (result.ok) {
    snapshot = result.data
    imported = true
    assert.equal(snapshot.gradeRunPersisted, true)
    const industrialSaved = (await send({ op: 'save' })).project
    const beforeRefusal = structuredClone(snapshot)
    const denied = await workspace.request({ op: 'bindings-grade-regenerate-preview', revision: snapshot.revision, ...payload })
    assert.equal(denied.ok, false, 'Industrial manufacturing attachments must not silently regenerate')
    assert.match(denied.error, /manufacturing|metadata|attachment|unsupported|notch|allowance|stale native source graph/i)
    const commitDenied = await workspace.request({ op: 'bindings-grade-regenerate', revision: snapshot.revision, ...payload })
    assert.equal(commitDenied.ok, false, 'Unsupported industrial commit must fail closed')
    assert.equal(snapshot.revision, beforeRefusal.revision)
    assert.deepEqual((await send({ op: 'save' })).project, industrialSaved)
    blocked.push({ request: 'bindings-grade-regenerate-preview and commit',
      reason: 'Physical notches and edge seam allowances on an authoritative bound panel are not propagated by the native Rust reactive engine',
      nativeError: denied.error, commitError: commitDenied.error })
  } else {
    assert.match(result.error, /grade|source|binding|notch|allowance|compile|metadata|stale fitting cache/i)
    blocked.push({ request: 'open industrial graded project',
      reason: 'Rust rejects a manufacturing-augmented grade catalog before a reactive industrial transaction is possible',
      nativeError: result.error })
    await send({ op: 'snapshot' })
    assert.deepEqual(snapshot.template, beforeIndustrial.template)
  }
  checks.push(`Authoritative industrial attachment scenario blocked safely (${imported ? 'reactive operation refused' : 'native project import refused'})`)
  console.log(JSON.stringify({ passed: true, nativeRust: true, disposable: true, checks, blocked,
    sizes, observations, sourceRevision: prior.revision, committedRevision: prior.revision + 1,
    physicalCutAndStitchInspected: observations.length > 0, industrialPropagationAccepted: false,
    manufacturerReady: false, cuttingAuthorized: false, factoryApproved: false }, null, 2))
} catch (error) {
  console.log(JSON.stringify({ passed: false, nativeRust: true, disposable: true, checks, blocked,
    reason: error?.message ?? String(error), industrialPropagationAccepted: false,
    manufacturerReady: false, cuttingAuthorized: false, factoryApproved: false }, null, 2))
  process.exitCode = 1
} finally {
  workspace.close()
  fs.rmSync(root, { recursive: true, force: true })
}
