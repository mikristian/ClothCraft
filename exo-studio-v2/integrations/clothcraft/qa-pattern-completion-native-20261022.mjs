// Disposable end-to-end HTTP proof of native 2D -> compiled mesh -> grade ->
// factory handoff revision consistency. Does not open a user project or app.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { createServer } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const binary = path.join(root, 'research/oss/clothcraft/target/debug/exo-session')
const avatar = path.join(root, 'research/oss/clothcraft/assets/makehuman/mannequin.obj')
assert(existsSync(binary) && existsSync(avatar), 'Native exo-session and mannequin required; this QA never builds them')
const output = mkdtempSync(path.join(tmpdir(), 'exo-unified-handoff-'))
mkdirSync(path.join(output, 'workspace'), { recursive: true })
const reserve = createServer()
const port = await new Promise((resolve, reject) => {
 reserve.once('error', reject)
 reserve.listen(0, '127.0.0.1', () => resolve(reserve.address().port))
})
await new Promise(resolve => reserve.close(resolve))
const base = `http://127.0.0.1:${port}`
const child = spawn(process.execPath, ['integrations/clothcraft/server.mjs'], {
 cwd: root,
 env: { ...process.env, EXO_CLOTHCRAFT_PORT: String(port), EXO_CLOTHCRAFT_OUTPUT_DIR: output,
  EXO_CLOTHCRAFT_REPO: path.join(root, 'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN: binary, EXO_CLOTHCRAFT_GPU: '0' },
 stdio: ['ignore', 'ignore', 'pipe'],
})
let errors = ''
child.stderr.on('data', data => { errors = (errors + data).slice(-1600) })
async function request(body, shouldPass = true) {
 const response = await fetch(`${base}/workspace`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body), signal: AbortSignal.timeout(45000),
 })
 const result = await response.json()
 assert.equal(result.ok, shouldPass, `${body.op}: ${result.error || JSON.stringify(result).slice(0, 350)}`)
 if (!shouldPass) {
  assert.equal(response.status, 422, `${body.op}: rejected native operation must be HTTP 422`)
  return result
 }
 assert.equal(response.status, 200)
 return result.data
}
const panelOf = (snapshot, id) => snapshot.template.panels.find(p => p.id === id)
const boundsMm = polygon => {
 const xs = polygon.points.map(p => p[0]), ys = polygon.points.map(p => p[1])
 return [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)].map(x => Math.round(x * 1000))
}
function verifyHandoff(handoff, snapshot, panelId) {
 assert.equal(handoff.format, 'exo-native-production-handoff.v1')
 assert.equal(handoff.atomic, true)
 assert.equal(handoff.revision, snapshot.revision)
 assert.equal(handoff.snapshot.revision, snapshot.revision)
 assert.equal(handoff.patternAudit.revision, snapshot.revision)
 assert.equal(handoff.cutlineProof.revision, snapshot.revision)
 assert.deepEqual(handoff.snapshot.template, snapshot.template)
 assert.deepEqual(handoff.snapshot.positions, snapshot.positions)
 assert.deepEqual(handoff.snapshot.uv, snapshot.uv)
 assert.deepEqual(handoff.snapshot.triangles, snapshot.triangles)
 assert.deepEqual(handoff.snapshot.panels, snapshot.panels)
 assert.deepEqual(handoff.snapshot.seams, snapshot.seams)
 assert(handoff.snapshot.positions.length > 0 && handoff.snapshot.triangles.length > 0)
 assert.equal(handoff.snapshot.positions.length, handoff.snapshot.uv.length)
 assert(handoff.snapshot.triangles.every(t => t.length === 3 && t.every(i => Number.isInteger(i) && i >= 0 && i < handoff.snapshot.positions.length)))
 assert(handoff.snapshot.panels.some(p => p.id === panelId))
 assert(handoff.patternAudit.panels.some(p => p.panelId === panelId))
 assert(handoff.cutlineProof.panels.some(p => p.panelId === panelId))
 assert.equal(handoff.manufacturerReady, false)
 assert(handoff.releaseBlockers.some(b => /3D fit|physical factory proof/i.test(b)))
 const proof = handoff.cutlineProof.panels.find(p => p.panelId === panelId)
 assert.equal(proof.ok, true, JSON.stringify(proof))
 assert(proof.pointCount >= 4)
 assert.equal(proof.svg, undefined, 'Unified handoff has no embedded heavy SVG payload')
 assert.equal(proof.dxf, undefined, 'Unified handoff has no embedded heavy DXF payload')
 return proof
}
try {
 let healthy = false
 for (let i = 0; i < 100; i++) {
  if (child.exitCode !== null) throw Error(`Disposable HTTP bridge stopped: ${errors}`)
  try {
   const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(750) })
   healthy = response.ok && (await response.json()).ok
   if (healthy) break
  } catch {}
  await sleep(150)
 }
 assert(healthy, `Disposable HTTP bridge did not start: ${errors}`)
 let state = await request({ op: 'open', preset: 'tshirt' })
 const fabric = state.template.fabrics[0].id
 state = await request({ op: 'edit', revision: state.revision,
  command: { kind: 'Primitive', shape: 'rectangle', size: [.2, .1], origin: [0, 0], fabric } })
 const created = state.template.panels.at(-1)
 const panelId = created.id
 assert.deepEqual(boundsMm(created.polygon), [200, 100])
 const edgeIds = [...created.polygon.edges]
 assert.equal(edgeIds.length, 4)
 const baseline = await request({ op: 'production-handoff', revision: state.revision })
 assert.equal(baseline.cutlineProof.panels.find(p => p.panelId === panelId).ok, false)
 assert(baseline.cutlineProof.blockedCount > 0)
 assert.equal(baseline.manufacturerReady, false)
 // A rejected edit must preserve the exact revision and geometry.
 const beforeInvalid = state.revision
 const invalid = await request({ op: 'edit', revision: beforeInvalid,
  command: { kind: 'SplitBoundary', panel: panelId, edge: 'missing-edge', at_m: .05 } }, false)
 assert.match(invalid.error, /edge|boundary|not found/i)
 state = await request({ op: 'snapshot' })
 assert.equal(state.revision, beforeInvalid)
 assert.deepEqual(panelOf(state, panelId).polygon.edges, edgeIds)
 for (const edge of edgeIds) {
  state = await request({ op: 'edit', revision: state.revision,
   command: { kind: 'SeamAllowance', panel: panelId, edge, width_m: .01 } })
 }
 state = await request({ op: 'edit', revision: state.revision,
  command: { kind: 'Notch', panel: panelId, edge: edgeIds[0], t: .25, depth_m: .004 } })
 const beforeSplit = state.revision
 state = await request({ op: 'edit', revision: state.revision,
  command: { kind: 'SplitBoundary', panel: panelId, edge: edgeIds[1], at_m: .05 } })
 assert.equal(state.revision, beforeSplit + 1)
 assert.equal(panelOf(state, panelId).polygon.edges.length, 5)
 assert.equal(panelOf(state, panelId).polygon.notches[edgeIds[0]][0].depth_m, .004)
 assert(panelOf(state, panelId).polygon.edges.every(edge => panelOf(state, panelId).polygon.seam_allowances[edge] === .01))
 const splitProof = verifyHandoff(await request({ op: 'production-handoff', revision: state.revision }), state, panelId)
 assert.equal(splitProof.notchMarkCount, 1)
 assert(splitProof.notchMarksMm.some(n => n.edgeId === edgeIds[0]))
 const staleRevision = beforeSplit
 const stale = await request({ op: 'production-handoff', revision: staleRevision }, false)
 assert.match(stale.error, /Stale document revision/i)
 assert.equal(stale.data.revision, state.revision)
 state = await request({ op: 'undo', revision: state.revision })
 assert.equal(panelOf(state, panelId).polygon.edges.length, 4)
 verifyHandoff(await request({ op: 'production-handoff', revision: state.revision }), state, panelId)
 state = await request({ op: 'redo', revision: state.revision })
 assert.equal(panelOf(state, panelId).polygon.edges.length, 5)
 verifyHandoff(await request({ op: 'production-handoff', revision: state.revision }), state, panelId)
 state = await request({ op: 'grade-pattern', revision: state.revision,
  panel: panelId, width_delta_mm: 20, height_delta_mm: 10 })
 assert.deepEqual(boundsMm(panelOf(state, panelId).polygon), [220, 110])
 assert.equal(panelOf(state, panelId).polygon.edges.length, 5)
 assert.equal(panelOf(state, panelId).polygon.notches[edgeIds[0]][0].depth_m, .004)
 const gradedProof = verifyHandoff(await request({ op: 'production-handoff', revision: state.revision }), state, panelId)
 assert.equal(gradedProof.notchMarkCount, 1)
 const beforeSave = state.revision
 const saved = await request({ op: 'save' })
 assert.equal(saved.project.template.panels.find(p => p.id === panelId).polygon.edges.length, 5)
 state = await request({ op: 'open', project: saved.project })
 assert.deepEqual(boundsMm(panelOf(state, panelId).polygon), [220, 110])
 verifyHandoff(await request({ op: 'production-handoff', revision: state.revision }), state, panelId)
 const rejected = await request({ op: 'production-handoff', revision: beforeSave + 100 }, false)
 assert.match(rejected.error, /Stale document revision/i)
 const fullProof=await request({op: 'production-cutlines',revision:state.revision})
 writeFileSync('docs/qa/pattern-completion-20261022/native-proof.json',JSON.stringify(fullProof))
 console.log(JSON.stringify({ pass: true, transport: 'isolated HTTP /workspace',
  operations: ['snapshot', 'edit', 'SplitBoundary', 'save', 'grade-pattern', 'production-handoff', 'undo', 'redo'],
  revisionIntegrity: true, compiledMesh: true, patternAndCutlineLinked: true, notchAndAllowancePreserved: true,
  blockedMissingAllowance: true, invalidEditAtomic: true, staleRevisionRejected: true,
  undoRedo: true, saveReopen: true, gradedDimensionsMm: [220, 110], factoryApproved: false,
  revisionBeforeSave: beforeSave, finalRevision: state.revision, isolated: true }, null, 2))
} finally {
 child.kill('SIGTERM')
 await Promise.race([new Promise(resolve => child.once('exit', resolve)), sleep(1500)])
 if (child.exitCode === null) child.kill('SIGKILL')
 rmSync(output, { recursive: true, force: true })
}
