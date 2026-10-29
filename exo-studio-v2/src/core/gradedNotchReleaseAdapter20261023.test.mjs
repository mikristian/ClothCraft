import test from 'node:test'
import assert from 'node:assert/strict'
import {gradePiece,gradeProject} from './grading.js'
import {edgePointAt} from './project.js'
import {inspectManufacturingReleaseReadiness} from './manufacturingReleaseReadiness.js'
import {createGradedNotchReleaseAdapter20261023 as adapt} from './gradedNotchReleaseAdapter20261023.js'

const grading={sizes:['M','L'],baseSize:'M',widthPerSizeCm:2,lengthPerSizeCm:1}
const piece=(id='front')=>({id,points:[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}],
  notches:[{id:'arm',edgeIndex:0,t:.35,x:3.5,y:0,type:'double',matchGroupId:'arm-pair'}]})
const project=()=>({id:'garment',grading,pieces:[piece('front'),piece('back')],
  manufacturingFindings:[{code:'EXISTING_BLOCKER',severity:'blocker'}],
  productionSpec:{},patternSource:{source:'author'},gradeProvenance:{reviewer:'pending'}})

test('generic gradePiece keeps source and redirects stale cache to physical edge',()=>{
  const original=piece(),graded=gradePiece(original,grading,'L'),before=structuredClone(graded)
  const result=adapt(graded,{size:'L'})
  assert.deepEqual(graded,before)
  assert.deepEqual(original,piece())
  assert.notEqual(graded.notches[0].x,result.view.notches[0].x)
  const physical=edgePointAt(graded,0,.35,64).point
  assert.deepEqual({x:result.view.notches[0].x,y:result.view.notches[0].y},physical)
  assert.equal(result.view.notches[0].matchGroupId,'arm-pair')
  assert.equal(result.view.patternImportProvenance.referenceOnly,true)
  assert.equal(result.view.gradeProvenance.status,'DEVELOPMENT_ONLY_FACTORY_APPROVAL_REQUIRED')
  assert.equal(result.view.factoryCuttingAuthorized,false)
})

test('gradeProject all pieces: retains existing blocker evidence and release gate blocks',()=>{
  const source=project(),graded=gradeProject(source,'L'),before=structuredClone(graded)
  const result=adapt(graded)
  assert.deepEqual(graded,before)
  assert.deepEqual(source,project())
  assert.deepEqual(result.view.manufacturingFindings,before.manufacturingFindings)
  assert.equal(result.view.gradeProvenance.reviewer,'pending')
  assert.equal(result.view.patternSource.source,'author')
  assert.equal(result.size,'L')
  for(const p of result.view.pieces){
    assert.deepEqual({x:p.notches[0].x,y:p.notches[0].y},edgePointAt(p,0,.35,64).point)
    assert.equal(p.patternImportProvenance.referenceOnly,true)
  }
  const readiness=inspectManufacturingReleaseReadiness(result.view)
  assert.equal(readiness.factoryCertified,false)
  assert.equal(readiness.factoryCuttingAuthorized,false)
  assert.equal(readiness.status,'BLOCKED_NOT_APPROVED')
  assert(readiness.blockers.some(b=>b.code==='UNAPPROVED_GRADE_TABLE'))
  assert(readiness.blockers.some(b=>b.code==='REFERENCE_ONLY_PATTERN'))
})

test('seam-locked-affine gradeProject fixes stale cache as development-only',()=>{
  const source=project()
  source.productionSpec={gradingModel:'seam-locked-affine-v1',referenceHalfChestCm:54,referenceBodyLengthCm:71}
  const graded=gradeProject(source,'L'),original=structuredClone(graded)
  const result=adapt(graded,{size:'L'})
  assert.deepEqual(graded,original)
  assert.notDeepEqual(result.view.pieces[0].notches[0],graded.pieces[0].notches[0])
  assert.deepEqual({x:result.view.pieces[0].notches[0].x,y:result.view.pieces[0].notches[0].y},edgePointAt(graded.pieces[0],0,.35,64).point)
  assert.equal(result.view.gradeProvenance.factoryCertified,false)
  assert.equal(inspectManufacturingReleaseReadiness(result.view).factoryCuttingAuthorized,false)
})

test('malformed size, duplicate identities and damaged notch caches fail atomically',()=>{
  const base=gradeProject(project(),'L')
  assert.throws(()=>adapt(base,{size:'M'}),/size does not match/)
  const duplicate=structuredClone(base);duplicate.pieces[1].id='front'
  assert.throws(()=>adapt(duplicate),/duplicate piece ID/)
  for(const mutate of [
    p=>{delete p.pieces[1].notches[0].y},
    p=>{p.pieces[0].notches[0].x=NaN},
    p=>{p.pieces[0].notches[0].edgeIndex=10},
    p=>{p.pieces[1].notches[0].id=''},
    p=>{p.pieces[0].notches='wrong'},
  ]){
    const bad=structuredClone(base);mutate(bad);const before=structuredClone(bad)
    assert.throws(()=>adapt(bad))
    assert.deepEqual(bad,before)
  }
})

test('cache absent remains absent even in an adapter release view',()=>{
  const p=gradePiece(piece(),grading,'M')
  delete p.notches[0].x;delete p.notches[0].y
  const result=adapt(p)
  assert.equal(Object.hasOwn(result.view.notches[0],'x'),false)
  assert.equal(result.factoryCertified,false)
})
