import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {getEdgeSeamAllowance} from './project.js'
import {inspectManufacturingReleaseReadiness} from './manufacturingReleaseReadiness.js'

function specimen(t){
  const project=createTeeTemplate()
  for(const piece of project.pieces)piece.notches=[]
  const piece=project.pieces.find(p=>Object.keys(p.curves||{}).some(i=>getEdgeSeamAllowance(p,+i)>.6))
  assert.ok(piece)
  const edgeIndex=+Object.keys(piece.curves).find(i=>getEdgeSeamAllowance(piece,+i)>.6)
  piece.notches=[{id:'release-double-endpoint',edgeIndex,t,type:'double',depthCm:.3}]
  return {project,piece}
}

for(const t of [0,1])test(`endpoint ${t} blocks release at each size without source mutation`,()=>{
  const {project,piece}=specimen(t),before=structuredClone(project)
  const state=inspectManufacturingReleaseReadiness(project)
  const rows=state.blockers.filter(b=>b.code==='INDUSTRIAL_DOUBLE_NOTCH_QA'&&b.reason.includes('DOUBLE_NOTCH_ENDPOINT_CLIPPING'))
  assert.equal(rows.length,project.grading.sizes.length,JSON.stringify(state.blockers))
  for(const size of project.grading.sizes)assert(rows.some(r=>r.reason.includes(`${size} / ${piece.id} / release-double-endpoint`)))
  assert.equal(state.digitalCounts.industrialDoubleNotchBlockers,rows.length)
  assert.equal(state.engineeringGeometryPass,false)
  assert.equal(state.factoryCertified,false)
  assert.equal(state.factoryCuttingAuthorized,false)
  assert.equal(state.status,'BLOCKED_NOT_APPROVED')
  assert.deepEqual(project,before)
})

test('factory-package cached checks cannot conceal a rejected physical double notch',()=>{
  const {project}=specimen(0),before=structuredClone(project)
  const clean={blockers:0,issues:[],blockerCount:0,status:'pass'}
  const injected={production:clean,industrial:clean,cutlines:clean,gradedTopology:clean,notches:clean,
    junctions:{...clean,status:'not_configured'},sample:clean,
    standaloneNotches:clean,industrialDoubleNotches:clean}
  const state=inspectManufacturingReleaseReadiness(project,{checks:injected})
  assert.equal(state.digitalCounts.industrialDoubleNotchBlockers,project.grading.sizes.length)
  assert.equal(state.engineeringGeometryPass,false)
  assert.equal(state.status,'BLOCKED_NOT_APPROVED')
  assert(state.blockers.some(b=>b.code==='INDUSTRIAL_DOUBLE_NOTCH_QA'&&b.reason.includes('DOUBLE_NOTCH_ENDPOINT_CLIPPING')))
  assert.deepEqual(project,before)
})

test('interior double notch does not create a double-notch blocker',()=>{
  const {project}=specimen(.5)
  const state=inspectManufacturingReleaseReadiness(project)
  assert.equal(state.digitalCounts.industrialDoubleNotchBlockers,0,JSON.stringify(state.blockers))
  assert(!state.blockers.some(b=>b.code.startsWith('INDUSTRIAL_DOUBLE_NOTCH_QA')))
})
