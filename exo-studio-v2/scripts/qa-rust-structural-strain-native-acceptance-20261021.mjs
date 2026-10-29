// RUST-033 scoped native acceptance: structural strain numbers only.
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createTemplateProject } from '../src/data/templates.js'
import { buildSimulation, refreshSimulationAnalysis } from '../src/core/physics.js'

const binary = process.env.GARMENT_CLOTH_ANALYSIS_TEST || '/tmp/garment-cloth-analysis-test'
assert.ok(existsSync(binary), `Missing native cloth-analysis executable: ${binary}`)
const fixtures = []
for (const fixture of ['tee', 'pants', 'perturbed-tee']) {
  const project = createTemplateProject(fixture === 'pants' ? 'pants' : 'tee')
  const simulation = buildSimulation(project)
  if (fixture === 'perturbed-tee') {
    const particle = [...simulation.pieces.values()][0].particles[0]
    particle.position.x += 0.1
    particle.position.z += 0.075
    particle.contactDepth = 0.02
  }
  const ordered = [...simulation.pieces.values()].flatMap(piece => piece.particles)
  const indices = new Map(ordered.map((particle, index) => [particle, index]))
  const encode = constraint => ({
    type: constraint.type,
    a: indices.get(constraint.a),
    b: indices.get(constraint.b),
    rest: constraint.rest,
    seamId: constraint.seamId ?? null,
    ...(constraint.type === 'seam-virtual' ? {
      sourceParticles: constraint.sourceParticles.map(p => indices.get(p)),
      targetParticles: constraint.targetParticles.map(p => indices.get(p)),
      sourceWeights: constraint.sourceWeights,
      targetWeights: constraint.targetWeights,
    } : {}),
  })
  const snapshot = {
    particles: ordered.map(p => ({
      ...Object.fromEntries(['thickness', 'contactDepth', 'patternV', 'wrapMode']
        .filter(key => p[key] !== undefined).map(key => [key, p[key]])),
      position: { x: p.position.x, y: p.position.y, z: p.position.z },
      seamIds: [...(p.seamIds || [])],
    })),
    constraints: simulation.constraints.map(encode),
    seamConstraints: simulation.seamConstraints.map(encode),
  }
  const request = { project, simulation: snapshot }
  const inputJSON = JSON.stringify(request)
  refreshSimulationAnalysis(simulation, project)
  assert.equal(JSON.stringify(request), inputJSON, `${fixture}: input JSON mutated during JS analysis`)
  fixtures.push({ fixture, simulation, ordered, request, inputJSON })
}

const input = fixtures.map(item => item.inputJSON).join('\n') + '\n'
const native = spawnSync(binary, ['--json-lines'], {
  input, encoding: 'utf8', maxBuffer: 100 * 1024 * 1024,
})
if (native.error) throw native.error
assert.equal(native.status, 0, native.stderr)
const replies = native.stdout.trim().split('\n').map(JSON.parse)
assert.equal(replies.length, fixtures.length, 'Native response count')

let allChecks = 0
let globalMaxError = 0
for (let i = 0; i < fixtures.length; i++) {
  const item = fixtures[i]
  const response = replies[i]
  assert.equal(response.ok, true, `${item.fixture}: ${response.error || 'native error'}`)
  assert.equal(response.result.particles.length, item.ordered.length)
  let checks = 0, maxError = 0
  const numeric = (actual, expected, label, exact = false) => {
    assert.equal(typeof actual, 'number', label)
    assert.equal(typeof expected, 'number', label)
    const error = Math.abs(actual - expected)
    assert.ok(Number.isFinite(error), `${item.fixture} ${label}: nonfinite result`)
    assert.ok(exact ? actual === expected : error <= 1e-7,
      `${item.fixture} ${label}: native ${actual}, JS ${expected}, error ${error}`)
    checks++
    maxError = Math.max(maxError, error)
  }
  numeric(response.result.strain.average, item.simulation.strain.average, 'strain.average')
  numeric(response.result.strain.max, item.simulation.strain.max, 'strain.max')
  item.ordered.forEach((particle, j) => {
    numeric(response.result.particles[j].strain, particle.strain, `particles[${j}].strain`)
    numeric(response.result.particles[j].strainSamples, particle.strainSamples, `particles[${j}].strainSamples`, true)
  })
  assert.equal(JSON.stringify(item.request), item.inputJSON, `${item.fixture}: input JSON changed`)
  allChecks += checks
  globalMaxError = Math.max(globalMaxError, maxError)
  console.log(JSON.stringify({ pass: true, fixture: item.fixture,
    particles: item.ordered.length, numericChecks: checks, maxError,
    inputJSONUnchanged: true }))
}
console.log(JSON.stringify({ pass: true, executable: binary,
  fixtures: fixtures.length, numericChecks: allChecks,
  maxError: globalMaxError, inputJSONUnchanged: true }))
