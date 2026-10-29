import test from 'node:test'
import assert from 'node:assert/strict'
import {assembleNativeSeams} from './seamAssembly.js'

const fixture=()=>{
  const particles=[]
  const pieces=[]
  for(let panel=0;panel<3;panel++){
    const base=particles.length, x=panel*.08
    for(const [u,v] of [[0,0],[.03,0],[0,.03]])particles.push({id:particles.length,pieceId:`panel${panel}`,position:[x+u,v,0],invMass:1})
    pieces.push({id:`panel${panel}`,particleIndices:[base,base+1,base+2],flatVerticesM:[[0,0,0],[.03,0,0],[0,.03,0]],faces:[[0,1,2]]})
  }
  return {particles,pieces,constraints:[{type:'seam',seamId:'joinA',a:1,b:3},{type:'seam',seamId:'joinB',a:4,b:6}]}
}

test('three-panel staging reduces both independent seam gaps without mutating authored particles',()=>{
  const input=fixture(), original=structuredClone(input)
  const staged=assembleNativeSeams(input,{iterations:24,restStiffness:.5,positionStiffness:0})
  assert.deepEqual(input,original)
  assert.ok(staged.assemblyExperiment.output.initialSeamGapMaximumMm < staged.assemblyExperiment.input.initialSeamGapMaximumMm)
  const gap=(particles,a,b)=>Math.hypot(...[0,1,2].map(axis=>particles[a].position[axis]-particles[b].position[axis]))
  for(const [a,b] of [[1,3],[4,6]])assert.ok(gap(staged.particles,a,b)<gap(input.particles,a,b))
  assert.ok(staged.particles.every(p=>p.position.every(Number.isFinite)))
  assert.equal(staged.assemblyExperiment.safeToAutoApply,false)
})

test('seam staging respects anchored vertices at an internal multipanel junction',()=>{
  const input=fixture()
  input.particles[4].invMass=0
  const original=structuredClone(input.particles[4].position)
  const staged=assembleNativeSeams(input,{iterations:12,positionStiffness:0})
  assert.deepEqual(staged.particles[4].position,original)
  assert.deepEqual(staged.particles[4].previous,original)
})
