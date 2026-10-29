import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { evaluatePpfFitAcceptance } from '../ppf_backend/fitAcceptance.mjs'

const folder = path.join('blender_bridge', 'output', 'ppf-fit-tuning-20261013')
const read = name => JSON.parse(fs.readFileSync(path.join(folder,name),'utf8'))
const solver = read('solver-report.json')
const contact = read('contact-report.json')
const ipc = read('ipc-ccd.json')
const sewing = read('sewing-report.json')
const clearance = read('clearance-report.json')
const config = JSON.parse(fs.readFileSync(path.join(folder,'tee-staged.json'),'utf8'))
const evaluation = evaluatePpfFitAcceptance({ contact, sewing, requiresIpcCcd: true, ipcCcd: ipc,
  requiresShoulderFit: true, clearance })
assert.equal(solver.ok,true)
assert.equal(contact.frames,20)
assert.equal(ipc.framesAudited,20)
assert.equal(contact.allFramesWithinStrainLimit,true)
assert.equal(contact.allFramesAvatarIntersectionFree,false)
assert.equal(ipc.allTestedStepsCollisionFree,false)
assert.equal(evaluation.accepted,false,'Unsafe Thomas drape must never be accepted')
const report = {
  fixture: 'Experimental opt-in 20-frame Thomas soft supports and -10cm torso shift',
  solverComplete: solver.ok,
  material: config.fabrics.main.material,
  gravity: config.scene.gravity,
  softSupports: config.shell.temporaryShoulderSupports,
  firstAvatarCrossingFrame: contact.firstAvatarCrossingFrame,
  maxAvatarIntersectionPairs: contact.maxAvatarIntersectionPairs,
  maxClothSelfIntersectionPairs: contact.maxSelfIntersectionPairs,
  maximumPrincipalStretch: contact.maxPrincipalStretch,
  maxConfiguredPrincipalStretch: 1 + config.fabrics.main.material.strainLimitPercent / 100,
  finalSeamGapMeanCm: sewing.finalMeanGapCm,
  finalSeamGapMaxCm: sewing.finalMaxGapCm,
  meanTorsoClearanceCm: clearance.final.torso.meanCm,
  meanShoulderClearanceCm: clearance.final.shoulder.meanCm,
  shoulderClearanceP90Cm: clearance.final.shoulder.p90Cm,
  ipcFirstBlockedFrame: ipc.firstBlockedFrame,
  fitAcceptance: evaluation,
}
const output = path.join(folder,'fit-tuning-summary.json')
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify(report,null,2))
