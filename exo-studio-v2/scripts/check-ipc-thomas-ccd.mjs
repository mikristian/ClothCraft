import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const blender = process.env.BLENDER || '/Applications/Blender.app/Contents/MacOS/Blender'
const solved = 'blender_bridge/output/tee-thomas-body-safe-solved.blend'
const payload = 'blender_bridge/fixtures/tee-thomas-body-safe.ppf.json'
const pc2 = 'blender_bridge/output/data/tee-thomas-body-safe-solved/6ca1b1cc-6b03-4dc7-9587-fac8300ea3db.pc2'
for (const file of [solved, payload, pc2]) {
  assert.ok(fs.existsSync(path.join(root, file)), `Private local IPC fixture is unavailable: ${file}`)
}
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gs-ipc-ccd-'))
try {
  const reportFile = path.join(temp, 'report.json')
  const outcome = spawnSync(blender, [
    '--background', solved, '--python', 'blender_bridge/check_thomas_ipc_ccd.py', '--',
    '--payload', payload, '--pc2', pc2, '--report', reportFile,
  ], { cwd: root, encoding: 'utf8', timeout: 90000, maxBuffer: 2 * 1024 * 1024 })
  assert.equal(outcome.status, 0, `Blender/IPC failed:\n${outcome.stderr}\n${outcome.stdout}`)
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'))
  assert.equal(report.syntheticCrossingRegression.sweptCrossingRejected, true)
  assert.equal(report.bodyFaceCount, 17999)
  assert.equal(report.framesAudited, 10)
  assert.equal(report.steps.length, 9)
  assert.equal(report.firstBlockedFrame, 3, 'CCD failed to identify the known Thomas collision at frame 3')
  assert.equal(report.allTestedStepsCollisionFree, false)
  assert.deepEqual(report.steps.slice(0, 2).map(({collisionFree}) => collisionFree), [true, true])
  assert.equal(report.steps[2].collisionFree, false)
  assert.ok(report.steps[2].maxSafeStepFraction > 0 && report.steps[2].maxSafeStepFraction < 1)
  console.log(JSON.stringify({ pass: true, backend: report.tool, bodyFaces: report.bodyFaceCount,
    clothFaces: report.clothFaceCount, framesAudited: report.framesAudited,
    firstBlockedFrame: report.firstBlockedFrame,
    firstBlockedMaxSafeStep: report.steps[2].maxSafeStepFraction }, null, 2))
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}
