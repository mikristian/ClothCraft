import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {inspectGradedComplexSeamConstructionAcceptance20261024 as inspect} from './gradedComplexSeamConstructionAcceptance20261024_1501.js'
import {edgePointAt} from './project.js'

const fixture=({reverseB=false,partial=false,notchB=.5}={})=>{
  const piece=id=>({id,points:[{id:id+'0',x:0,y:0},{id:id+'1',x:10,y:0},{id:id+'2',x:10,y:10},{id:id+'3',x:0,y:10}],
    curves:{0:{cx:5,cy:-2}},notches:[{id:id+'n',edgeIndex:0,t:id==='a'?.5:notchB,matchGroupId:'g',matchedSeamId:'s'}],
    internalLines:[{id:id+'fold',type:'fold',a:{x:5,y:-1},b:{x:10,y:5},aAnchor:{edgeIndex:0,t:.5},bAnchor:{edgeIndex:1,t:.5}}]})
  return {pieces:[piece('a'),piece('b')],seams:[{id:'s',a:{pieceId:'a',edgeIndex:0,...(partial?{startT:.2,endT:.8}:{})},
    b:{pieceId:'b',edgeIndex:0,...(partial?{startT:.2,endT:.8}:{})},reverseB}],
    grading:{sizes:['M','L'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0}}
}

test('curved paired seams and anchored construction are measurable, never factory certified',()=>{
  const project=fixture(),before=structuredClone(project),result=inspect(project)
  assert.equal(result.status,'measurement_only',JSON.stringify(result.issues))
  assert.equal(result.factoryCertified,false)
  assert.equal(result.manufacturingApproved,false)
  assert.equal(result.physicalFitApproved,false)
  assert.equal(result.seamRows.length,2)
  assert.equal(result.attachmentRows.length,8)
  assert.deepEqual(project,before)
})

test('real six-size Foundation Tee runs curves and paired notch stations with explicit unsolved construction requirements',()=>{
  const source=createTeeTemplate(),copy=structuredClone(source),result=inspect(source)
  assert.equal(source.grading.sizes.length,6)
  assert.equal(result.seamRows.length,14*6)
  assert.equal(result.notchRows.length,4*6)
  assert.equal(result.factoryCertified,false)
  assert.equal(result.status,'blocked')
  assert(result.issues.some(issue=>issue.code==='UNVERIFIED_CONSTRUCTION_METADATA'))
  assert.deepEqual(source,copy)
})

test('partial curve intervals follow physical sewn range',()=>{
  const result=inspect(fixture({partial:true}))
  assert.equal(result.status,'measurement_only',JSON.stringify(result.issues))
  assert.equal(result.seamRows.length,2)
  assert(result.seamRows.every(row=>row.partial&&row.pass))
})

test('reverse orientation needs complementary paired notch fractions',()=>{
  const mismatch=inspect(fixture({reverseB:true,notchB:.2}))
  assert.equal(mismatch.status,'blocked')
  assert(mismatch.issues.some(issue=>issue.code==='NOTCH_NOTCH_INTERVAL_MISALIGNMENT'))
  const matching=inspect(fixture({reverseB:true}))
  assert.equal(matching.status,'measurement_only',JSON.stringify(matching.issues))
})

test('displaced notch on curve blocks without repairing the source',()=>{
  const project=fixture({notchB:.65}),before=structuredClone(project),result=inspect(project)
  assert.equal(result.status,'blocked')
  assert(result.issues.some(issue=>issue.code==='NOTCH_NOTCH_INTERVAL_MISALIGNMENT'))
  assert.deepEqual(project,before)
})

test('seam on mismatched curved source geometry blocks full size run',()=>{
  const project=fixture();project.pieces[1].curves[0].cy=-7
  const result=inspect(project)
  assert.equal(result.status,'blocked')
  assert(result.issues.some(issue=>issue.code==='GRADED_CURVED_SEAM_LENGTH_MISMATCH'))
})

test('unanchored construction marks are blocked despite interpolated grade output',()=>{
  const project=fixture();delete project.pieces[0].internalLines[0].aAnchor
  const result=inspect(project)
  assert.equal(result.status,'blocked')
  assert(result.issues.some(issue=>issue.code==='UNANCHORED_CONSTRUCTION_ENDPOINT'))
})

test('invalid anchors, unsupported ease and unsupported metadata block',()=>{
  const invalid=fixture();invalid.pieces[0].internalLines[0].aAnchor={edgeIndex:0,t:1.3}
  assert(inspect(invalid).issues.some(issue=>issue.code==='INVALID_CONSTRUCTION_ANCHOR'))
  const ease=fixture();ease.seams[0].allowEase=true
  assert(inspect(ease).issues.some(issue=>issue.code==='UNSUPPORTED_SEAM_SEMANTICS'))
  const opaque=fixture();opaque.pieces[0].zippers=[{id:'z'}]
  assert(inspect(opaque).issues.some(issue=>issue.code==='UNVERIFIED_CONSTRUCTION_METADATA'))
})

test('duplicated IDs, no seams and missing notch counterpart fail closed',()=>{
  const duplicate=fixture();duplicate.pieces[1].id='a'
  assert(inspect(duplicate).issues.some(issue=>issue.code==='AMBIGUOUS_PIECE_ID'))
  const noSeam=fixture();noSeam.seams=[]
  assert.equal(inspect(noSeam).status,'blocked')
  const missing=fixture();missing.pieces[1].notches=[]
  assert.equal(inspect(missing).status,'blocked')
})

test('malicious getter never executes and tolerance cannot be widened',()=>{
  const source=fixture();let touched=false
  Object.defineProperty(source.pieces[0],'stolen',{enumerable:true,get(){touched=true;throw Error('getter called')}})
  assert.equal(inspect(source).status,'blocked')
  assert.equal(touched,false)
  assert(inspect(fixture(),{seamToleranceCm:1}).issues.some(issue=>issue.code==='INVALID_TOLERANCE'))
})

test('source line with valid anchor but stale endpoint is blocked, including base size',()=>{
  const source=fixture(),saved=structuredClone(source)
  source.pieces[0].internalLines[0].a={x:999,y:999}
  const report=inspect(source)
  assert.equal(report.status,'blocked')
  assert(report.issues.some(issue=>issue.code==='SOURCE_CONSTRUCTION_ANCHOR_DRIFT'))
  assert.equal(report.manufacturingApproved,false)
  assert.deepEqual(source.pieces[1],saved.pieces[1])
})

test('authored curved notch with stale x/y is blocked at physical arclength station',()=>{
  const source=fixture()
  const notch=source.pieces[0].notches[0]
  notch.x=400;notch.y=400
  const result=inspect(source)
  assert.equal(result.status,'blocked')
  assert(result.issues.some(issue=>issue.code==='SOURCE_NOTCH_COORDINATE_DRIFT'))
})

test('correctly positioned authored curved notch remains measurement-only',()=>{
  const source=fixture(),notch=source.pieces[0].notches[0]
  const station=edgePointAt(source.pieces[0],0,notch.t,64).point
  notch.x=station.x;notch.y=station.y
  const result=inspect(source)
  assert.equal(result.status,'measurement_only',JSON.stringify(result.issues))
})

test('unsupported point, curve, notch and project metadata all block',()=>{
  const examples=[
    project=>{project.pieces[0].points[0].oldAttachment={edgeIndex:0}},
    project=>{project.pieces[0].curves[0].staleEdgeId='edge-other'},
    project=>{project.pieces[0].notches[0].staleNotchPointer='other'},
    project=>{project.unknownAssemblyReferences={edge:0}},
  ]
  const expected=['UNSUPPORTED_POINT_METADATA','UNSUPPORTED_CURVE_METADATA','UNSUPPORTED_NOTCH_METADATA','UNSUPPORTED_PROJECT_METADATA']
  examples.forEach((mutate,i)=>{
    const source=fixture();mutate(source)
    const result=inspect(source)
    assert.equal(result.status,'blocked',expected[i])
    assert(result.issues.some(issue=>issue.code===expected[i]),JSON.stringify(result.issues))
  })
})

test('non-array topstitches including empty object fail closed',()=>{
  for(const unexpected of [{}, {length:0}, 'topstitch', 42]){
    const source=fixture();source.pieces[0].topstitches=unexpected
    const result=inspect(source)
    assert.equal(result.status,'blocked',String(unexpected))
    assert(result.issues.some(issue=>issue.code==='MALFORMED_CONSTRUCTION_COLLECTION'))
  }
})
