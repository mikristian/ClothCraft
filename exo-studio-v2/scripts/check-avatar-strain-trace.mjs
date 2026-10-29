import assert from 'node:assert/strict'
import { createTeeTemplate } from '../src/data/templates.js'
import { buildSimulation, refreshSimulationAnalysis, stepSimulation } from '../src/core/physics.js'

const project = createTeeTemplate()
Object.assign(project.avatar, { shoulderWidthCm: 54, neckCm: 44, bicepCm: 40, armLengthCm: 78 })
const simulation = buildSimulation(project)
for (let frame = 0; frame < 120; frame++) stepSimulation(simulation, project, 1 / 60)
const before = [...simulation.pieces.values()].flatMap(piece => piece.particles.map(p => p.position.toArray()))
refreshSimulationAnalysis(simulation, project)
const after = [...simulation.pieces.values()].flatMap(piece => piece.particles.map(p => p.position.toArray()))
assert.deepEqual(after, before, 'quality reporting must be read-only')

const { structural, sewing } = simulation.quality
assert.equal(structural.worstStructuralEdges.length, 10)
assert.equal(structural.worstStructuralEdges[0].strainPercent, structural.maxStrainPercent)
assert.ok(structural.worstStructuralEdges.every(edge =>
  Number.isInteger(edge.constraintIndex) &&
  edge.particleIds.every(id => typeof id === 'string' && id.length > 0) &&
  edge.pieceIds.every(id => typeof id === 'string' && id.length > 0) &&
  edge.restLengthMm > 0 && Number.isFinite(edge.currentLengthMm) &&
  Number.isFinite(edge.strainPercent) && edge.seamIds.every(Array.isArray)))
for (let index = 1; index < structural.worstStructuralEdges.length; index++) {
  assert.ok(structural.worstStructuralEdges[index - 1].strainPercent >= structural.worstStructuralEdges[index].strainPercent)
}
assert.equal(new Set(structural.worstStructuralEdges.map(edge => edge.constraintIndex)).size, 10)
assert.ok(sewing.worstSeams.some(seam => seam.gapMm > 0))
assert.equal(simulation.quality.acceptance.factoryApproved, false)

console.log(JSON.stringify({
  worstStructuralEdges: structural.worstStructuralEdges.slice(0, 3),
  p95StrainPercent: structural.p95StrainPercent,
  maxStrainPercent: structural.maxStrainPercent,
  worstSeams: sewing.worstSeams.slice(0, 3),
}))
