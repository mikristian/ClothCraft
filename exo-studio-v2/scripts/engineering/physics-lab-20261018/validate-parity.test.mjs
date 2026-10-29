import test from 'node:test'
import assert from 'node:assert/strict'
import {validate} from './validate-parity.mjs'

const hash = digit => digit.repeat(64)
function fixture(backend, steps = 40) {
  const gpu = backend === 'gpu'
  const label = gpu ? 'ClothCraft GPU VBD + CPU OGC' : 'ClothCraft CPU VBD + OGC'
  return {
    schema: 'exo.physics-lab.v2', requestedBackend: backend,
    binarySha256: hash('a'), sourceSha256: hash('b'), avatarSha256: hash('c'),
    actualBackendReported: [label],
    cases: [{preset: 'tshirt', status: 'initial_assembly_transient_measured', steps,
      initial: {backend: label, vertices: 12, triangles: 20, seams: 2, time_s: 0, max_seam_gap_m: 0.53},
      final_time_s: steps / 60,
      trajectory: Array.from({length: steps}, (_, i) => ({step: i + 1, time_s: (i + 1) / 60, dt_s: 1 / 60, iterations: 16, max_seam_gap_m: gpu ? .5 : .01, extension_p95_percent: 5, step_ms: gpu ? 4 : 8})),
      timeTrajectory: Array.from({length: steps + 1}, (_, i) => ({step: i, time_s: i / 60}))}]}
}
test('valid identical binary with distinct source snapshots is comparable', () => {
  const cpu = fixture('cpu'), gpu = fixture('gpu')
  gpu.sourceSha256 = hash('d')
  const result = validate(cpu, gpu)
  assert.equal(result.ok, true)
  assert.equal(result.sourceFingerprintMatched, false)
})
test('divergent physical outcomes remain comparable measurements', () => {
  const result = validate(fixture('cpu'), fixture('gpu'))
  assert.equal(result.ok, true)
  assert.equal(result.perStep.length, 40)
})
test('tampered executable rejected', () => {
  const cpu = fixture('cpu'), gpu = fixture('gpu')
  gpu.binarySha256 = hash('d')
  assert.equal(validate(cpu, gpu).ok, false)
})
test('missing steps and time mismatch rejected', () => {
  const cpu = fixture('cpu'), gpu = fixture('gpu')
  gpu.cases[0].trajectory.pop()
  assert.equal(validate(cpu, gpu).ok, false)
  gpu.cases[0].trajectory.push({...cpu.cases[0].trajectory[39], time_s: 2})
  assert.equal(validate(cpu, gpu).ok, false)
})
test('backend fallback and nonfinite timing rejected', () => {
  const cpu = fixture('cpu'), gpu = fixture('gpu')
  gpu.cases[0].initial.backend = 'ClothCraft CPU VBD + OGC'
  assert.equal(validate(cpu, gpu).ok, false)
  gpu.cases[0].initial.backend = gpu.actualBackendReported[0]
  gpu.cases[0].trajectory[4].step_ms = null
  assert.equal(validate(cpu, gpu).ok, false)
})
test('mesh topology and avatar mismatches rejected', () => {
  const cpu = fixture('cpu'), gpu = fixture('gpu')
  gpu.cases[0].initial.seams = 3
  assert.equal(validate(cpu, gpu).ok, false)
  gpu.cases[0].initial.seams = 2
  gpu.avatarSha256 = hash('d')
  assert.equal(validate(cpu, gpu).ok, false)
})
function addTelemetry(report, fallbackIndices = []) {
  let count = 0
  report.cases[0].trajectory.forEach((step, i) => {
    const fallback = fallbackIndices.includes(i)
    count += Number(fallback)
    step.actualStepBackend = fallback ? 'CPU fallback' : 'GPU'
    step.gpuCpuFallbackCount = count
    Object.assign(report.cases[0].timeTrajectory[i + 1], {actualStepBackend:step.actualStepBackend, gpuCpuFallbackCount:count})
  })
}
test('hybrid fallback is comparable but blocks GPU acceleration claim', () => {
  const cpu = fixture('cpu'), gpu = fixture('gpu')
  addTelemetry(gpu, [4, 9])
  const result = validate(cpu, gpu)
  assert.equal(result.ok, true)
  assert.equal(result.backendClassification, 'hybrid_gpu_cpu_fallback')
  assert.equal(result.fallbackSteps, 2)
  assert.equal(result.gpuCpuFallbackCount, 2)
  assert.equal(result.gpuAccelerationClaimAllowed, false)
})
test('all-GPU telemetry classified without fallback', () => {
  const gpu = fixture('gpu'); addTelemetry(gpu)
  const result = validate(fixture('cpu'), gpu)
  assert.equal(result.ok, true)
  assert.equal(result.backendClassification, 'gpu_reported_all_steps')
  assert.equal(result.gpuSteps, 40)
})
test('counter decreases, skips or substitutes CPU silently are invalid', () => {
  for (const mutation of [
    step => {step.gpuCpuFallbackCount = -1},
    step => {step.gpuCpuFallbackCount = 4},
    step => {step.actualStepBackend = 'CPU'},
    step => {delete step.actualStepBackend},
  ]) {
    const gpu = fixture('gpu'); addTelemetry(gpu, [1]); mutation(gpu.cases[0].trajectory[2])
    assert.equal(validate(fixture('cpu'), gpu).ok, false)
  }
})
