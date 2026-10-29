// Prototype regression uses PRIVATE LOCAL Thomas PPF fixture, never uploads it.
// The results are intentionally an engineering failure for garment fit, not
// a certification: swept contact is safe but seam convergence is blocked.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const blender = process.env.BLENDER || '/Applications/Blender.app/Contents/MacOS/Blender'
const source = path.join(root, 'blender_bridge/fixtures/tee-thomas-body-safe.ppf.json')
const nativeSource = path.join(root, 'native_backend/fixtures/tee-balanced.native-sim.json')
const scene = path.join(root, 'blender_bridge/output/tee-thomas-body-safe-solved.blend')
const binary = path.join(root, 'native_backend/bin/garment_xpbd_cli')
for (const file of [source, nativeSource, scene, binary]) assert.ok(fs.existsSync(file), `Missing local fixture: ${file}`)

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gs-native-ipc-proto-'))
try {
  const payload = JSON.parse(fs.readFileSync(nativeSource, 'utf8'))
  const staged = JSON.parse(fs.readFileSync(source, 'utf8'))
  assert.equal(payload.particles.length, staged.shell.vertices.length, 'T-shirt meshes must have identical topology')
  payload.avatar = { ...staged.avatar.measurements, model: 'clo-thomas' }
  payload.particles.forEach((particle, i) => {
    particle.position = [...staged.shell.vertices[i]]
    particle.previous = [...particle.position]
  })
  const input = path.join(directory, 'input.json')
  const output = path.join(directory, 'output.json')
  const reportPath = path.join(directory, 'report.json')
  fs.writeFileSync(input, JSON.stringify(payload))
  const run = spawnSync(blender, ['--background', scene, '--python', 'blender_bridge/native_ipc_step.py', '--',
    '--input', input, '--output', output, '--report', reportPath, '--frames', '4', '--binary', binary],
  { cwd: root, timeout: 90000, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 })
  assert.equal(run.status, 0, `Blender/native IPC prototype failed:\n${run.stdout}\n${run.stderr}`)
  assert.ok(fs.existsSync(reportPath), 'Prototype did not emit a report')
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
  assert.equal(report.initialIntersections, false)
  assert.equal(report.allAcceptedStepsCollisionFree, true)
  assert.equal(report.frames, 4)
  assert.equal(report.steps.length, 4)
  assert.ok(report.steps.every((step) => step.appliedFraction >= 0 && step.appliedFraction <= 1), 'Invalid movement fraction')
  assert.ok(report.steps.some((step) => step.backtracked), 'Known native unsafe trajectory was not detected')
  assert.ok(report.meanSeamGapCm > 10, 'Prototype has unexpectedly changed its known seam-convergence deficiency; re-evaluate before enabling')
  console.log(JSON.stringify({ pass: true, prototypeOnly: true,
    bodyTriangles: report.bodyTriangles, clothTriangles: report.clothTriangles,
    collisionFreeAcceptedSteps: report.steps.length, meanSeamGapCm: report.meanSeamGapCm,
    finalAppliedFraction: report.steps.at(-1).appliedFraction }, null, 2))
} finally {
  fs.rmSync(directory, { recursive: true, force: true })
}
