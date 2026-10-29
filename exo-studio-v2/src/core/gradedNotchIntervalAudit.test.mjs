import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectGradedNotchSeamIntervals} from './gradedNotchIntervalAudit.js'
import {inspectGradedNotchPairs} from './industrialNotchQA.js'
import {createTeeTemplate} from '../data/templates.js'
import {quadraticArcLength,quadraticAtLengthFraction} from './draftingPrecision.js'

const fixture = ({startA=.25,endA=.75,startB=.25,endB=.75,tA=.5,tB=.5,reverseB=false,curved=false}={}) => {
  const piece = id => ({id,points:[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}],
    ...(curved?{curves:{0:{cx:2,cy:-6}}}:{}),
    notches:[{id:`${id}-notch`,edgeIndex:0,t:id==='a'?tA:tB,matchGroupId:'pair',matchedSeamId:'sew'}]})
  return {pieces:[piece('a'),piece('b')],seams:[{id:'sew',
    a:{pieceId:'a',edgeIndex:0,startT:startA,endT:endA},
    b:{pieceId:'b',edgeIndex:0,startT:startB,endT:endB},reverseB}],
    grading:{sizes:['M','L'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0}}
}

test('paired notches on partial sewn edges pass when their physical stations match',()=>{
 const project=fixture(), before=structuredClone(project)
 const qa=inspectGradedNotchSeamIntervals(project)
 assert.equal(qa.status,'pass')
 assert.equal(qa.checks.length,2)
 assert(qa.checks.every(row=>row.offsetCm<1e-8))
 assert.equal(qa.factoryCertified,false)
 assert.deepEqual(project,before)
})

test('notches outside sewn intervals fail even when legacy whole-edge matching passes',()=>{
 const project=fixture({tA:.1,tB:.1})
 assert.equal(inspectGradedNotchPairs(project).status,'pass')
 const qa=inspectGradedNotchSeamIntervals(project)
 assert.equal(qa.status,'blocked')
 assert.equal(qa.blockers,2)
 assert(qa.issues.every(issue=>issue.code==='NOTCH_OUTSIDE_SEWN_INTERVAL'))
})

test('different partial seam starts produce real station mismatch despite equal full-edge notch fractions',()=>{
 const project=fixture({startA:.3,endA:.8,startB:.1,endB:.6})
 assert.equal(inspectGradedNotchPairs(project).status,'pass')
 const qa=inspectGradedNotchSeamIntervals(project)
 assert.equal(qa.blockers,2)
 assert(qa.issues.every(issue=>issue.code==='NOTCH_INTERVAL_MISALIGNMENT'))
 assert(Math.abs(qa.checks[0].offsetCm-2)<1e-8)
})

test('reverse B measures from its sewn endpoint, not its full-edge start',()=>{
 const project=fixture({tA:.3,tB:.7,reverseB:true})
 const qa=inspectGradedNotchSeamIntervals(project)
 assert.equal(qa.status,'pass',JSON.stringify(qa.issues))
 assert(qa.checks.every(row=>row.offsetCm<1e-8))
})

test('curved edges use Bézier parameter seam bounds and true arclength notch stations',()=>{
 const project=fixture({curved:true,startA:.2,endA:.8,startB:.2,endB:.8})
 const qa=inspectGradedNotchSeamIntervals(project)
 assert.equal(qa.status,'pass',JSON.stringify(qa.issues))
 const a=project.pieces[0].points[0],b=project.pieces[0].points[1],control={x:2,y:-6}
 const physicalMid=quadraticAtLengthFraction(a,control,b,.5).parameter
 const expected=quadraticArcLength(a,control,b,.2,physicalMid)
 assert(Math.abs(qa.checks[0].stationAcm-expected)<1e-4)
})

test('invalid interval and missing graded notch fail closed',()=>{
 const project=fixture({startA:.9,endA:.1})
 assert(inspectGradedNotchSeamIntervals(project).issues.some(issue=>issue.code==='INVALID_NOTCH_SEWN_INTERVAL'))
 const missing=fixture();missing.pieces[1].notches=[]
 assert(inspectGradedNotchSeamIntervals(missing).issues.some(issue=>issue.code==='INVALID_NOTCH_GROUP'))
 assert.throws(()=>inspectGradedNotchSeamIntervals(fixture(),{toleranceCm:-1}),/tolerance/)
})

test('duplicate piece or seam IDs block grading alignment approval',()=>{
 const duplicatePiece=fixture()
 duplicatePiece.pieces.push(structuredClone(duplicatePiece.pieces[0]))
 assert(inspectGradedNotchSeamIntervals(duplicatePiece).issues.some(issue=>issue.code==='AMBIGUOUS_PIECE_ID'))
 const duplicateSeam=fixture()
 duplicateSeam.seams.push(structuredClone(duplicateSeam.seams[0]))
 assert(inspectGradedNotchSeamIntervals(duplicateSeam).issues.some(issue=>issue.code==='AMBIGUOUS_SEAM_ID'))
})

test('real Foundation Tee paired full-edge notches remain aligned across six graded sizes',()=>{
 const tee=createTeeTemplate(),before=JSON.stringify(tee)
 const qa=inspectGradedNotchSeamIntervals(tee)
 assert.equal(qa.status,'pass',JSON.stringify(qa.issues))
 assert.equal(qa.pairedGroups,4)
 assert.equal(qa.checks.length,24)
 assert.equal(JSON.stringify(tee),before)
})
