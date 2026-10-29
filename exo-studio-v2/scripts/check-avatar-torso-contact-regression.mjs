import assert from 'node:assert/strict'
import { createTeeTemplate } from '../src/data/templates.js'
import { buildSimulation, stepSimulation } from '../src/core/physics.js'

const project = createTeeTemplate()
Object.assign(project.avatar, { shoulderWidthCm: 54, neckCm: 44, bicepCm: 40, armLengthCm: 78 })
const simulation = buildSimulation(project)
for (let frame = 0; frame < 120; frame++) stepSimulation(simulation, project, 1 / 60)
const structural = simulation.constraints.filter(c => c.type === 'structural')
const stretched = structural.map(c => c.a.position.distanceTo(c.b.position) / c.rest - 1)
const worst = Math.max(...stretched)
const seams = simulation.seamConstraints.map(c => c.a.position.distanceTo(c.b.position))
const meanGap = seams.reduce((sum, gap) => sum + gap, 0) / seams.length

// Relative to the independently recorded original 8.365 peak stretch and
// 0.0118 m mean seam gap, these guards ensure the geometric contact fix
// actually improves local deformation without sacrificing seam closure.
assert.ok(worst < 5.0, `torso contact stretched a structural edge by ${(worst * 100).toFixed(1)}%`)
assert.ok(meanGap <= 0.0118, `torso contact opened seams to ${(meanGap * 100).toFixed(2)} cm`)
assert.ok(stretched.every(Number.isFinite))
console.log(JSON.stringify({ peakStructuralExtensionPercent: +(worst * 100).toFixed(1), meanSeamGapCm: +(meanGap * 100).toFixed(2), structuralEdges: structural.length, seamPairs: seams.length }))
