import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { createTemplateProject } from '../src/data/templates.js'
import { buildNativeSimulationPayload } from '../src/core/backends/nativePayload.js'
import { evaluatePpfFitAcceptance } from '../ppf_backend/fitAcceptance.mjs'

// Reproducible numerical preflight, deliberately separate from solver/CCD certification.
const report = []
for (const garment of ['tee', 'hoodie', 'zip-hoodie']) {
  const source = createTemplateProject(garment)
  const beforeSource = JSON.stringify(source)
  const baseline = buildNativeSimulationPayload(source, { quality: 'quality' })
  const assembled = buildNativeSimulationPayload(source, { quality: 'quality', experimentalSewFirst: true })
  const repeated = buildNativeSimulationPayload(source, { quality: 'quality', experimentalSewFirst: true })
  assert.equal(JSON.stringify(source), beforeSource, `${garment}: source mutated`)
  assert.deepEqual(assembled.particles.map(p => p.position), repeated.particles.map(p => p.position), `${garment}: nondeterministic candidate`)
  assert.deepEqual(assembled.pieces, baseline.pieces, `${garment}: mesh changed`)
  assert.deepEqual(assembled.constraints, baseline.constraints, `${garment}: constraints changed`)
  assert.deepEqual(assembled.anchors, baseline.anchors, `${garment}: pins changed`)
  const b = baseline.initialAssembly, a = assembled.initialAssembly, c = assembled.assemblyExperiment.collision
  for (const value of [b.initialSeamGapMaximumMm, a.initialSeamGapMaximumMm,
    b.initialMeshPeakEdgeStrainPercent, a.initialMeshPeakEdgeStrainPercent,
    c.maximumIntrusionMm, c.checked]) assert.ok(Number.isFinite(value), `${garment}: invalid measurement`)
  assert.ok(a.initialSeamGapMaximumMm < b.initialSeamGapMaximumMm * 0.15, `${garment}: gap did not improve`)
  assert.ok(a.initialMeshPeakEdgeStrainPercent < b.initialMeshPeakEdgeStrainPercent, `${garment}: strain did not improve`)
  assert.ok(c.maximumIntrusionMm > 0, `${garment}: expected real sampled initial body intrusion evidence`)
  assert.ok(c.checked > 0)
  assert.equal(assembled.assemblyExperiment.collisionCertified, false)
  assert.equal(assembled.assemblyExperiment.safeToAutoApply, false)
  report.push({ garment, baselineMaxGapMm: b.initialSeamGapMaximumMm,
    assembledMaxGapMm: a.initialSeamGapMaximumMm,
    baselinePeakEdgeStrainPercent: b.initialMeshPeakEdgeStrainPercent,
    assembledPeakEdgeStrainPercent: a.initialMeshPeakEdgeStrainPercent,
    sampledMaximumBodyIntrusionMm: c.maximumIntrusionMm, sampledChecks: c.checked,
    simulationRan: false, fullTrajectorySelfIntersectionAudited: false,
    sweptCollisionAudited: false, fitAccepted: false })
}
assert.equal(evaluatePpfFitAcceptance({ contact: null, sewing: null, requiresIpcCcd: true,
  requiresShoulderFit: true }).accepted, false)
console.log(JSON.stringify({ pass: true, scope: 'initial preassembly only',
  nativeXpbdAvailable: existsSync('native_backend/bin/garment_xpbd_cli'),
  ppfRustAvailable: existsSync('research/ppf-local/runtime/ppf-contact-solver-2026-09-22-20-52-macos-arm64/target/release/ppf-contact-solver'),
  reports: report }, null, 2))
