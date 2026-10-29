#!/usr/bin/env node
// Compare CPU/GPU *physics* before publishing a throughput claim. Run both
// modes against the same feature-enabled exo-session executable beforehand.
import {readFile,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'

const cpuFile=resolve(process.argv[2]||'docs/physics-lab/same-source-cpu-arm64.json')
const gpuFile=resolve(process.argv[3]||'docs/physics-lab/same-source-gpu-arm64.json')
const output=resolve(process.argv[4]||'docs/physics-lab/same-source-cpu-gpu-comparison.json')
const [cpu,gpu]=await Promise.all([cpuFile,gpuFile].map(async file=>JSON.parse(await readFile(file,'utf8'))))
const a=cpu.cases.find(c=>c.preset==='tshirt')
const b=gpu.cases.find(c=>c.preset==='tshirt')
const preconditions={
  sameBinary:cpu.binarySha256===gpu.binarySha256,
  sameAvatar:cpu.avatarSha256===gpu.avatarSha256,
  sameSourceFingerprint:cpu.sourceSha256===gpu.sourceSha256,
  requestedCpu:cpu.requestedBackend==='cpu',
  requestedGpu:gpu.requestedBackend==='gpu',
  backendReportedCorrectly:a?.initial?.backend?.includes('CPU VBD')&&b?.initial?.backend?.includes('GPU VBD'),
  matchedSteps:Number.isInteger(a?.steps)&&a.steps===b?.steps&&a.steps>0,
  sameInitialSeamGap:Number.isFinite(a?.initial?.max_seam_gap_m)&&a.initial.max_seam_gap_m===b?.initial?.max_seam_gap_m,
  sameInitialMesh:a?.initial?.vertices===b?.initial?.vertices&&a?.initial?.triangles===b?.initial?.triangles,
}
// The actual executable SHA256 is authoritative for this comparison. The
// sourceSha256 field fingerprints a *live* adapter file that another agent
// may edit between runs, even while both experiments use the SAME immutable
// executable. Preserve that observation but never reject identical binaries
// solely because mutable source changed after their build.
if(Object.entries(preconditions).some(([name,valid])=>name!=='sameSourceFingerprint'&&!valid))
  throw Error(`Incomparable builds or fixtures: ${JSON.stringify(preconditions)}`)
const differences=[]
for(let i=0;i<a.trajectory.length;i++){
  const c=a.trajectory[i],g=b.trajectory[i]
  if(c.time_s!==g.time_s||c.dt_s!==g.dt_s||c.iterations!==g.iterations)throw Error(`Step ${i+1} time or settings differ`)
  differences.push({
    step:i+1,time_s:c.time_s,
    cpu_seam_gap_mm:c.max_seam_gap_m*1000,
    gpu_seam_gap_mm:g.max_seam_gap_m*1000,
    absolute_seam_difference_mm:Math.abs(c.max_seam_gap_m-g.max_seam_gap_m)*1000,
    cpu_extension_p95_percent:c.extension_p95_percent,
    gpu_extension_p95_percent:g.extension_p95_percent,
    cpu_contact_updates:c.detection_updates,
    gpu_contact_updates:g.detection_updates,
    cpu_step_ms:c.step_ms,
    gpu_step_ms:g.step_ms,
    observed_wall_ratio:c.step_ms/g.step_ms,
  })
}
const last=differences.at(-1)
const initial=a.initial.max_seam_gap_m*1000
// Deliberately provisional numerical screening limits for these matching
// assembly fixtures. They do not constitute material or production fit gates.
const screen={seamDifferenceMm:5,p95ExtensionDifferencePercentagePoints:5}
const diverged=differences.some(s=>
  s.absolute_seam_difference_mm>screen.seamDifferenceMm||
  Math.abs(s.cpu_extension_p95_percent-s.gpu_extension_p95_percent)>screen.p95ExtensionDifferencePercentagePoints)
// Comparing isolated step runtimes is meaningless when one backend does not
// assemble the same garment. Give the first *observed* time at each physical
// seam milestone; null means it was not reached during this experiment.
const milestone=(backend,thresholdMm)=>{
  const field=backend+'_seam_gap_mm'
  const timeField=backend+'_step_ms'
  let accumulatedWallMs=0
  for(const row of differences){
    accumulatedWallMs+=row[timeField]
    if(row[field]<=thresholdMm)return{step:row.step,simulatedTimeS:row.time_s,accumulatedWallMs}
  }
  return null
}
const assemblyMilestones=[25,10,5].map(thresholdMm=>({
  maxSeamGapMm:thresholdMm,cpu:milestone('cpu',thresholdMm),gpu:milestone('gpu',thresholdMm),
  speedRatioAtEquivalentGeometry:null,
}))
const report={
  schema:'exo.physics-cpu-gpu-parity.v1',
  cpuFile,gpuFile,binarySha256:cpu.binarySha256,preconditions,
  currentSourceFingerprintWarning:preconditions.sameSourceFingerprint?null:'Current adapter source fingerprints differ between experiment timestamps; identical executable hashes prove identical tested binary bytes, not source checkout provenance.',
  scope:'Same-source same-arm64-executable CPU f64 versus Metal f32/CPU-OGC, early separated-panel assembly only',
  acceptance:diverged?'BLOCKED_PHYSICAL_DIVERGENCE':'WITHIN_PRELIMINARY_NUMERICAL_SCREEN',
  reason:diverged
    ?'Materially different seam closure or extension despite matching initial 2D geometry. Wall-time ratio is observational and cannot be published as an equivalent-quality physics acceleration.'
    :'No major difference detected by this provisional early-assembly screen; longer fit/contact trajectories and independent validation remain required before a performance claim.',
  numericalScreen:screen,
  userFitCertified:false,independentPenetrationVerified:false,equilibriumEstablished:false,
  initialSeamGapMm:initial,
  cpuClosedMm:initial-last.cpu_seam_gap_mm,
  gpuClosedMm:initial-last.gpu_seam_gap_mm,
  finalSeamGapDifferenceMm:last.absolute_seam_difference_mm,
  assemblyMilestones,
  steps:differences,
}
await writeFile(output,JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({output,status:report.acceptance,initialSeamGapMm:initial,cpuClosedMm:report.cpuClosedMm,gpuClosedMm:report.gpuClosedMm,finalSeamGapDifferenceMm:last.absolute_seam_difference_mm,wallRatios:differences.map(x=>x.observed_wall_ratio)},null,2))
if(diverged&&process.env.EXO_PHYSICS_PARITY_STRICT==='1')process.exitCode=1
