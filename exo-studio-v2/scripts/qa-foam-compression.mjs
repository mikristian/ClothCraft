import assert from 'node:assert/strict'
import {DEFAULT_FOAM_MATERIAL, normalizeFoamMaterial, normalizeFoamCompressionProperties, foamPressFalloff, stepFoamCompressionState} from '../src/core/foamCompressionModel.js'

const props = normalizeFoamCompressionProperties()
assert.deepEqual(props, normalizeFoamCompressionProperties({densityKgM3: NaN, compressionKpa: Infinity}))
assert.equal(normalizeFoamCompressionProperties({compressionKpa: -10, maxCompression: 42}).compressionKpa, 5)
assert.equal(normalizeFoamCompressionProperties({compressionKpa: -10, maxCompression: 42}).maxCompression, 0.9)
assert.equal(normalizeFoamMaterial(DEFAULT_FOAM_MATERIAL).contactRadiusCm, 4)
assert.equal(normalizeFoamMaterial({contactRadiusCm: 100}).contactRadiusCm, 20)
assert.equal(foamPressFalloff(0, 4), 1)
assert.equal(foamPressFalloff(4, 4), 0)
assert.equal(foamPressFalloff(-1, 4), 0)
assert.equal(foamPressFalloff(2, 4), 0.5)
assert.equal(foamPressFalloff(10, 0), 0)

const run = (properties, press, count = 120) => {
  let s = undefined
  for (let i = 0; i < count; i++) {
    s = stepFoamCompressionState(s, press, 1 / 60, properties)
    assert.ok(Number.isFinite(s.compression) && Number.isFinite(s.velocity) && Number.isFinite(s.memory))
    assert.ok(s.compression >= 0 && s.compression <= normalizeFoamCompressionProperties(properties).maxCompression)
  }
  return s
}
const press = {pressStrength: 1, pressureKpa: 45, depthCm: 2}
assert.ok(stepFoamCompressionState(undefined, {press: true, pressure: 45}, 1 / 60).compression > 0)
const soft = run({compressionKpa: 10}, press)
const stiff = run({compressionKpa: 300}, press)
assert.ok(soft.compression > stiff.compression * 3)
assert.ok(soft.displacementCm > 0)
assert.deepEqual(run({}, press), run({}, press), 'deterministic repeated simulation')
const untouched = stepFoamCompressionState(undefined, {...press, distanceCm: 8, radiusCm: 2}, 1 / 60)
assert.equal(untouched.compression, 0)
const frozen = stepFoamCompressionState(soft, press, 0, {compressionKpa: 10})
assert.equal(frozen.compression, soft.compression)
let recovered = soft
for (let i = 0; i < 360; i++) recovered = stepFoamCompressionState(recovered, {pressStrength: 0}, 1 / 60, {compressionKpa: 10})
assert.ok(recovered.compression < 1e-5, `expected recovery, got ${recovered.compression}`)
assert.ok(run({memory: 0.35, dampingRatio: 0.2}, press).compression <= 0.7)
const pathological = stepFoamCompressionState({compression: Infinity, velocity: Infinity}, {pressStrength: Infinity, pressureKpa: NaN}, Infinity, {recoverySeconds: -5})
assert.ok(Object.values(pathological).every(Number.isFinite))
console.log('Foam compression QA passed: bounds, falloff, softness, recovery, deterministic behavior, bad inputs')
