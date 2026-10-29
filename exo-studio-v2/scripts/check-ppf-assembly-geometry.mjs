import assert from 'node:assert/strict'
import { evaluatePpfAssembly } from '../ppf_backend/assemblyAcceptance.mjs'

const base = { shell: {
  vertices: [[0,0,0],[0.01,0,0],[0,0.01,0],[0.005,0.005,0]],
  faces: [[0,1,2]],
  stitchEdges: [{a:0,b:3,seamId:'test'}],
} }
assert.equal(evaluatePpfAssembly(base).accepted, true)
for (const [name, change, expected] of [
  ['duplicate triangle index', {faces:[[0,1,1]]}, 'invalid triangle 0'],
  ['collapsed triangle', {vertices:[[0,0,0],[0.01,0,0],[0.02,0,0],[0.005,0,0]]}, 'degenerate triangle 0'],
  ['nonfinite vertex', {vertices:[[0,0,0],[0.01,0,0],[0,NaN,0],[0.005,0.005,0]]}, 'invalid vertex 2'],
  ['invalid seam', {stitchEdges:[{a:0,b:9}]}, 'invalid stitch 0'],
  ['duplicate indexed face', {faces:[[0,1,2],[2,0,1]]}, 'duplicate triangle 1'],
  ['duplicate geometric face', {vertices:[[0,0,0],[0.01,0,0],[0,0.01,0],[0.005,0.005,0],[0,0,0],[0.01,0,0],[0,0.01,0]],faces:[[0,1,2],[4,5,6]]}, 'duplicate triangle 1'],
  ['thin sliver', {vertices:[[0,0,0],[1,0,0],[0.5,1e-9,0],[0.005,0.005,0]]}, 'thin sliver triangle 0'],
]) {
  const evaluated = evaluatePpfAssembly({shell:{...base.shell,...change}})
  assert.equal(evaluated.accepted,false,name)
  assert.equal(evaluated.mayRun,false,name)
  assert.ok(evaluated.geometryErrors.includes(expected),name)
  const override = evaluatePpfAssembly({shell:{...base.shell,...change}}, {allowExplodedExperimental:true})
  assert.equal(override.accepted,false,`${name}: override acceptance`)
  assert.equal(override.geometryValid,false,`${name}: override geometry`)
  assert.equal(override.experimentalOverride,false,`${name}: invalid override designation`)
  assert.equal(override.mayRun,false,`${name}: override must fail closed`)
}
const withoutFaces = {shell:{vertices:base.shell.vertices,stitchEdges:base.shell.stitchEdges}}
assert.equal(evaluatePpfAssembly(withoutFaces).geometryValid,true,'optional faces remain valid')
const narrowValid = {shell:{...base.shell,vertices:[[0,0,0],[0.01,0,0],[0.005,0.000001,0],[0.005,0.005,0]]}}
assert.equal(evaluatePpfAssembly(narrowValid).geometryValid,true,'ordinary narrow triangle allowed')
const reversedButDistinct = {shell:{...base.shell,vertices:[[0,0,0],[0.01,0,0],[0,0.01,0],[0.005,0.005,0],[0,0,0.000001],[0.01,0,0.000001],[0,0.01,0.000001]],faces:[[0,1,2],[4,5,6]]}}
assert.equal(evaluatePpfAssembly(reversedButDistinct).geometryValid,true,'closely layered triangles allowed')
const exploded = {...base,shell:{...base.shell,vertices:[[0,0,0],[0.01,0,0],[0,0.01,0],[0.04,0.005,0]]}}
assert.equal(evaluatePpfAssembly(exploded).accepted,false)
const explodedOverride = evaluatePpfAssembly(exploded,{allowExplodedExperimental:true})
assert.equal(explodedOverride.geometryValid,true)
assert.equal(explodedOverride.accepted,false)
assert.equal(explodedOverride.experimentalOverride,true)
assert.equal(explodedOverride.mayRun,true)
console.log('PPF assembly geometry integrity checks passed')
