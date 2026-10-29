#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises'

const finite = value => typeof value === 'number' && Number.isFinite(value)
const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value)
const near = (a, b) => finite(a) && finite(b) && Math.abs(a - b) <= 1e-10 * Math.max(1, Math.abs(a), Math.abs(b))

export function validate(cpu, gpu, expectedSteps = 40) {
  const errors = []
  const requireThat = (ok, description) => { if (!ok) errors.push(description) }
  const a = cpu?.cases?.find(c => c.preset === 'tshirt')
  const b = gpu?.cases?.find(c => c.preset === 'tshirt')
  requireThat(Number.isSafeInteger(expectedSteps) && expectedSteps > 0, 'invalid expected step count')
  requireThat(cpu?.schema === 'exo.physics-lab.v2' && gpu?.schema === 'exo.physics-lab.v2', 'schema mismatch')
  requireThat(sha(cpu?.binarySha256) && cpu.binarySha256 === gpu?.binarySha256, 'executable hash mismatch')
  requireThat(sha(cpu?.avatarSha256) && cpu.avatarSha256 === gpu?.avatarSha256, 'avatar hash mismatch')
  requireThat(cpu?.requestedBackend === 'cpu' && gpu?.requestedBackend === 'gpu', 'requested backend mismatch')
  requireThat(a?.status === 'initial_assembly_transient_measured' && b?.status === 'initial_assembly_transient_measured', 'incomplete fixture')
  requireThat(a?.initial?.backend?.includes('CPU VBD') && b?.initial?.backend?.includes('GPU VBD'), 'backend report mismatch or GPU fallback')
  requireThat(cpu?.actualBackendReported?.every(x => typeof x === 'string' && x.includes('CPU VBD')) && gpu?.actualBackendReported?.length === 1 && gpu.actualBackendReported[0] === b?.initial?.backend, 'reported backend disagreement')
  for (const field of ['vertices', 'triangles', 'seams']) requireThat(Number.isSafeInteger(a?.initial?.[field]) && a.initial[field] > 0 && a.initial[field] === b?.initial?.[field], `${field} mismatch`)
  requireThat(near(a?.initial?.time_s, b?.initial?.time_s) && near(a?.initial?.max_seam_gap_m, b?.initial?.max_seam_gap_m), 'initial time/geometry mismatch')
  requireThat(a?.steps === expectedSteps && b?.steps === expectedSteps && a?.trajectory?.length === expectedSteps && b?.trajectory?.length === expectedSteps && a?.timeTrajectory?.length === expectedSteps + 1 && b?.timeTrajectory?.length === expectedSteps + 1, 'missing or extra simulation steps')
  const perStep = []
  const backendTelemetry = b?.trajectory?.some(s => s && ('actualStepBackend' in s || 'gpuCpuFallbackCount' in s)) ?? false
  let previousFallbacks = 0
  let fallbackSteps = 0
  let gpuSteps = 0
  if (Array.isArray(a?.trajectory) && Array.isArray(b?.trajectory)) {
    for (let i = 0; i < expectedSteps; i++) {
      const c = a.trajectory[i], g = b.trajectory[i]
      if (!c || !g) continue
      requireThat(c.step === i + 1 && g.step === i + 1, `step ${i + 1}: ordering mismatch`)
      requireThat(near(c.time_s, g.time_s) && near(c.dt_s, g.dt_s) && c.iterations === g.iterations && finite(c.dt_s) && c.dt_s > 0, `step ${i + 1}: time/settings mismatch`)
      requireThat(near(a.timeTrajectory?.[i + 1]?.time_s, c.time_s) && near(b.timeTrajectory?.[i + 1]?.time_s, g.time_s), `step ${i + 1}: trajectory time mismatch`)
      if ('actualStepBackend' in c || 'gpuCpuFallbackCount' in c) {
        requireThat(c.actualStepBackend === 'CPU' && c.gpuCpuFallbackCount === 0, `step ${i + 1}: CPU baseline backend/counter disagreement`)
      }
      for (const [name, value] of [['cpu seam', c.max_seam_gap_m], ['gpu seam', g.max_seam_gap_m], ['cpu extension', c.extension_p95_percent], ['gpu extension', g.extension_p95_percent], ['cpu wall', c.step_ms], ['gpu wall', g.step_ms]]) requireThat(finite(value) && (name.includes('wall') ? value > 0 : true), `step ${i + 1}: invalid ${name}`)
      if (backendTelemetry) {
        const backend = g.actualStepBackend
        const count = g.gpuCpuFallbackCount
        requireThat(['GPU', 'CPU fallback'].includes(backend), `step ${i + 1}: unknown or missing GPU actualStepBackend`)
        requireThat(Number.isSafeInteger(count) && count >= previousFallbacks, `step ${i + 1}: invalid or decreasing fallback count`)
        if (Number.isSafeInteger(count)) {
          requireThat(count === previousFallbacks + (backend === 'CPU fallback' ? 1 : 0), `step ${i + 1}: fallback counter/backend inconsistency`)
          previousFallbacks = count
        }
        if (backend === 'CPU fallback') fallbackSteps++
        if (backend === 'GPU') gpuSteps++
        const snapshot = b.timeTrajectory?.[i + 1]
        if (snapshot && ('actualStepBackend' in snapshot || 'gpuCpuFallbackCount' in snapshot)) requireThat(snapshot.actualStepBackend === backend && snapshot.gpuCpuFallbackCount === count, `step ${i + 1}: snapshot/metrics backend disagreement`)
      }
      perStep.push({step: i + 1, cpuWallMs: c.step_ms, gpuWallMs: g.step_ms, ...(backendTelemetry ? {actualStepBackend:g.actualStepBackend,gpuCpuFallbackCount:g.gpuCpuFallbackCount} : {})})
    }
  }
  requireThat(near(a?.final_time_s, b?.final_time_s) && near(a?.final_time_s, a?.trajectory?.at(-1)?.time_s) && near(b?.final_time_s, b?.trajectory?.at(-1)?.time_s), 'final simulation time mismatch')
  const backendClassification = backendTelemetry ? (fallbackSteps > 0 ? 'hybrid_gpu_cpu_fallback' : 'gpu_reported_all_steps') : 'gpu_backend_unattested_per_step'
  return {ok: errors.length === 0, errors, expectedSteps, executableHashMatched: cpu?.binarySha256 === gpu?.binarySha256, sourceFingerprintMatched: cpu?.sourceSha256 === gpu?.sourceSha256, backendClassification, gpuSteps, fallbackSteps, gpuCpuFallbackCount: backendTelemetry ? previousFallbacks : null, gpuAccelerationClaimAllowed: false, accelerationClaimBlockReason: fallbackSteps ? 'CPU fallback occurred during requested GPU run' : 'requires independent numerical equivalence and fit validation beyond backend attribution', backendEvidence: backendTelemetry ? 'reported actualStepBackend and gpuCpuFallbackCount on each completed step; not independent kernel attestation' : 'session-open backend string; no per-step GPU execution/fallback attestation', timingEvidence: 'per-step native reported step_ms; excludes process startup', perStep}
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const [cpuPath, gpuPath, output, count] = process.argv.slice(2)
  if (!cpuPath || !gpuPath || !output) throw Error('Usage: validate-parity.mjs cpu.json gpu.json output.json [steps=40]')
  const [cpu, gpu] = await Promise.all([cpuPath, gpuPath].map(p => readFile(p, 'utf8').then(JSON.parse)))
  const result = validate(cpu, gpu, count === undefined ? 40 : Number(count))
  await writeFile(output, JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify({output, ok: result.ok, errors: result.errors}))
  if (!result.ok) process.exitCode = 1
}
