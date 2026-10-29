// Real Rust acceptance of the read-only six-size sewn-balance RPC.
// Runs against a disposable workspace and native exo-session. This script
// refuses to substitute JavaScript-computed sewing measurements for Rust proof.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createWorkspace } from './workspace.mjs'

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'exo-sewn-six-size-audit-'))
const workspace = createWorkspace(directory)
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const nearZero = (value, label) => assert(Number.isFinite(value) && Math.abs(value) <= 1e-6,
  `${label}: physical mismatch ${value} m`)
let current
const send = async command => {
  const response = await workspace.request({ revision: current?.revision, ...command })
  assert.equal(response.ok, true, `${command.op}: ${response.error ?? 'native request rejected'}`)
  if (response.data?.template) current = response.data
  return response.data
}
const rejectWithoutMutation = async command => {
  const before = structuredClone(current)
  const response = await workspace.request({ revision: current.revision, ...command })
  assert.equal(response.ok, false, `Invalid ${command.op} was accepted`)
  await send({ op: 'snapshot' })
  assert.equal(current.revision, before.revision)
  assert.deepEqual(current.template, before.template)
  return response.error
}

try {
  await send({ op: 'open', preset: 'tshirt' })
  for (const seam of [...current.template.seams]) {
    await send({ op: 'edit', command: { kind: 'RemoveSeam', seam: seam.id } })
  }
  const existing = new Set(current.template.panels.map(panel => panel.id))
  const fabric = current.template.fabrics[0].id
  for (let n = 0; n < 2; n++) {
    await send({ op: 'edit', command: { kind: 'Polygon', fabric,
      points: [[0, 0], [0.4, 0], [0.4, 0.32], [0, 0.32]] } })
  }
  const added = current.template.panels.filter(panel => !existing.has(panel.id))
  assert.equal(added.length, 2, 'Rust must author two native polygon panels')
  const [a, b] = added
  assert(a.polygon.edges[0] && b.polygon.edges[0], 'Native named edges required')
  const reference = panel => ({ panel: panel.id, side: 'top', edge: panel.polygon.edges[0], range: [0, 1] })
  // Same-sized, directed native stitch boundaries; real Rust Sew command
  // compiles and persists the relationship before six-size catalog creation.
  let stitchMode = 'authored-two-rectangle-native-sew'
  const stitch = await workspace.request({ revision: current.revision, op: 'edit', command: {
    kind: 'Sew', a: reference(a), b: reference(b), reverse: true, ease: false,
  } })
  if (!stitch.ok) {
    // A rejected native pair is explicit evidence of a setup blocker. Fall
    // back to the real sewn preset, never synthesize a seam or its audit.
    stitchMode = 'existing-sewn-tshirt-preset'
    await send({ op: 'open', preset: 'tshirt' })
    assert(current.template.seams.length > 0, 'Real sewn preset has no seams')
    console.error(JSON.stringify({ stage: 'rectangle-stitch', blocked: stitch.error,
      fallback: stitchMode }))
  } else {
    current = stitch.data
    const sewn = current.template.seams.find(seam =>
      [seam.a.panel, seam.b.panel].includes(a.id) &&
      [seam.a.panel, seam.b.panel].includes(b.id))
    assert(sewn, 'Rust did not store the named two-rectangle seam')
    assert.equal(sewn.allow_ease, false)
    assert.equal(sewn.reverse_b, true)
  }

  const authored = structuredClone(current.template)
  const gradeRun = { schemaVersion: 1, sizes, baseSize: 'M', baseTemplate: authored,
    gradedTemplates: sizes.map(() => structuredClone(authored)), pomSpecs: [] }
  await send({ op: 'grade-run-commit', gradeRun })
  assert.equal(current.gradeRunPersisted, true)
  const before = structuredClone(current)
  const invalidRevision = await rejectWithoutMutation({
    op: 'grade-run-sewing-balance-audit', revision: before.revision - 1,
  })
  assert.match(String(invalidRevision), /revision|stale|expected/i)
  const proof = await send({ op: 'grade-run-sewing-balance-audit' })
  assert.equal(proof.format, 'exo-native-six-size-sewn-balance-audit.v1')
  assert.equal(proof.sourceRevision, before.revision)
  assert.deepEqual(proof.sizes.map(row => row.size), sizes)
  assert.equal(proof.factoryApproved, false)
  assert.equal(proof.joinedCurveMutation, false)
  assert.equal(proof.easeReviewRequired, false)
  const authoredSeams = authored.seams
  assert(authoredSeams.length > 0)
  for (const size of proof.sizes) {
    assert.equal(size.seams.length, authoredSeams.length,
      `${size.size} must audit every persisted native seam`)
    for (const seam of size.seams) {
      const original = authoredSeams.find(item => item.id === seam.seamId)
      assert(original, `Unexpected native seam ${seam.seamId}`)
      assert.equal(seam.a.panelId, original.a.panel)
      assert.equal(seam.b.panelId, original.b.panel)
      assert.equal(seam.a.edgeId, original.a.edge)
      assert.equal(seam.b.edgeId, original.b.edge)
      assert.deepEqual(seam.a.interval, original.a.range)
      assert.deepEqual(seam.b.interval, original.b.range)
      assert.equal(seam.b.reversed, original.reverse_b)
      assert.equal(seam.allowEase, original.allow_ease)
      assert.equal(seam.requiresEaseReview, false)
      assert(Number.isFinite(seam.a.sewnIntervalM) && seam.a.sewnIntervalM > 0)
      assert(Number.isFinite(seam.b.sewnIntervalM) && seam.b.sewnIntervalM > 0)
      nearZero(seam.mismatchM, `${size.size}/${seam.seamId}`)
      for (const [index, interval] of seam.notchIntervalLengthsM.entries()) {
        nearZero(interval[0] - interval[1], `${size.size}/${seam.seamId}/notch-${index}`)
      }
    }
  }
  await send({ op: 'snapshot' })
  assert.equal(current.revision, before.revision, 'Read-only audit advanced revision')
  assert.deepEqual(current.template, before.template, 'Read-only audit changed source geometry')
  const saved = await send({ op: 'save' })
  assert.deepEqual(saved.project.template, authored)
  assert.equal(saved.project.grade_run.gradedTemplates.length, 6)
  await send({ op: 'open', project: saved.project })
  assert.equal(current.gradeRunPersisted, true)
  assert.deepEqual(current.template, authored)
  const after = await send({ op: 'grade-run-sewing-balance-audit' })
  assert.deepEqual(after.sizes, proof.sizes, 'Reopened Rust sewline evidence differs')
  assert.equal(after.easeReviewRequired, false)
  console.log(JSON.stringify({ passed: true, nativeRust: true, stitchMode,
    seamCount: authoredSeams.length, sizes, sourceRevision: before.revision,
    staleRevisionRejected: true, exactZeroMismatch: true, sourceImmutable: true,
    saveReopenVerified: true, factoryApproved: false }))
} finally {
  workspace.close()
  fs.rmSync(directory, { recursive: true, force: true })
}
