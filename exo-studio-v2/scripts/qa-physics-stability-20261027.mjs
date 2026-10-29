import test from 'node:test'
import assert from 'node:assert/strict'
import {resolveFabricDamping,resolveSolverTimestep} from '../src/core/physics/timestep.js'
import {createDefaultProject} from '../src/data/defaultProject.js'
import {buildSimulation,stepSimulation} from '../src/core/physics.js'
test('one second attenuation is independent of frame rate and substeps',()=>{
 for(const hz of [30,60,120,144])for(const substeps of [1,2,4]){
  const actual=resolveFabricDamping(.985,1/hz/substeps)**(hz*substeps)
  assert.ok(Math.abs(actual-.985**60)<1e-12)
 }
 assert.equal(resolveFabricDamping(.985,1/60),.985)
 assert.equal(resolveFabricDamping(0,0),1)
})
test('invalid settings cannot bypass scheduling validation',()=>{
 for(const key of ['substeps','iterations'])for(const value of [NaN,Infinity,-1,0,'4'])assert.throws(()=>resolveSolverTimestep({[key]:value}),RangeError)
 for(const value of [NaN,Infinity,-.1,1.01])assert.throws(()=>resolveFabricDamping(value),RangeError)
 assert.equal(resolveSolverTimestep({},0),null)
})
test('invalid material on a later piece cannot partially mutate a garment',()=>{
 const project=createDefaultProject(),simulation=buildSimulation(project)
 const pieces=[...simulation.pieces.values()];assert.ok(pieces.length>1)
 const state=()=>pieces.map(p=>p.particles.map(v=>[v.position.toArray(),v.previous.toArray(),v.contactDepth]))
 pieces.at(-1).fabric.damping=-.1;const before=state()
 assert.throws(()=>stepSimulation(simulation,project),RangeError)
 assert.deepEqual(state(),before)
})
test('valid garment simulation remains finite after repeated steps',()=>{
 const project=createDefaultProject(),simulation=buildSimulation(project)
 for(let i=0;i<12;i++)stepSimulation(simulation,project,1/60)
 for(const p of simulation.pieces.values())for(const v of p.particles)assert.ok(v.position.toArray().every(Number.isFinite))
})
