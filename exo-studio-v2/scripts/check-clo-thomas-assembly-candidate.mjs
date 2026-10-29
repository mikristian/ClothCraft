import assert from 'node:assert/strict'
import fs from 'node:fs'
import { validatePpfPayload } from '../src/core/backends/ppfPayload.js'
import { evaluatePpfAssembly } from '../ppf_backend/assemblyAcceptance.mjs'
import { analyzePpfStagingSeams } from '../ppf_backend/stagingDiagnostics.mjs'

// Pure geometry and PPF-contract gate. Native Blender BVH/skin-normal evidence
// must be provided by an *independently measured* optimizer report; a plausible
// rendered pose or seam-only adjustment cannot certify safe assembly.
const [candidatePath, solverReportPath, referencePath = 'blender_bridge/output/rigid-postalign-20261013/pose-final.json'] = process.argv.slice(2)
if (!candidatePath || !solverReportPath) {
  console.error('Usage: node scripts/check-clo-thomas-assembly-candidate.mjs <pose.json> <contact-and-strain-report.json> [reference-pose.json]')
  process.exit(64)
}
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const pose = read(candidatePath)
const baseline = read(referencePath)
const report = read(solverReportPath)
assert.equal(validatePpfPayload(pose).ok, true, 'Candidate PPF payload is invalid')
assert.deepEqual(pose.shell.faces, baseline.shell.faces, 'Reference topology may not change in assembly')
assert.deepEqual(pose.shell.stitchEdges, baseline.shell.stitchEdges, 'Sewing topology may not change in assembly')
assert.deepEqual(pose.shell.pieces, baseline.shell.pieces, 'Stable panel IDs may not change in assembly')
assert.deepEqual(pose.fabrics, baseline.fabrics, 'Physical fabric parameters may not be altered during assembly')
const reference = analyzePpfStagingSeams(baseline)
const result = analyzePpfStagingSeams(pose)
const strainValue = [report.maximumIntrinsicEdgeChange, report.finalMaxEdgeStrain,
  report.maximumRelativeIntrinsicEdgeChange, report.maximumEdgeChange,
  report.maxEdgeStrain, report.strain].find(Number.isFinite)
const body = [report.bodyIntersectionPairs, report.bodyCrossings, report.bodyHits].find(Number.isFinite)
const self = [report.selfIntersectionPairs, report.selfCrossings, report.selfHits].find(Number.isFinite)
const independentlyMeasured = Number.isFinite(strainValue) && Number.isFinite(body) && Number.isFinite(self)
assert.ok(independentlyMeasured, 'Missing separately measured intrinsic strain and body/self BVH contact counts')
const deformation = {
  maximumRelativeIntrinsicEdgeChange: strainValue,
  bodyIntersectionPairs: body,
  selfIntersectionPairs: self,
  geometryPreservedOrWithinLimit: strainValue <= .05,
  bodyAndSelfIntersectionFreeAtInitialPose: body === 0 && self === 0,
}
const verdict = evaluatePpfAssembly(pose, { deformation })
const summary = {
  source: candidatePath,
  initialWorstSeamGapCm: reference.maximumInitialSeamGapCm,
  candidateWorstSeamGapCm: result.maximumInitialSeamGapCm,
  changedSeamGapCm: +(reference.maximumInitialSeamGapCm - result.maximumInitialSeamGapCm).toFixed(3),
  maxIntrinsicEdgeChangePct: +(strainValue * 100).toFixed(4),
  avatarTriangleIntersections: body,
  clothSelfIntersections: self,
  sewingPairsPreserved: pose.shell.stitchEdges.length,
  preassemblyApprovedForPpf: verdict.accepted,
  preflightReason: verdict.reason,
  fitTrajectoryCertified: false,
}
console.log(JSON.stringify(summary, null, 2))
if (!verdict.accepted) process.exitCode = 2
