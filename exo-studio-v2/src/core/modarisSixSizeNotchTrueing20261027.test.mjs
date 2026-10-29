import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSewnIndustrialSizeRun20261024 } from './industrialSixSizeSeamContinuity20261024.js'
import { proposeModarisSixSizeNotchTrueing20261027 as trueNotches } from './modarisSixSizeNotchTrueing20261027.js'

const sizes = ['XS','S','M','L','XL','XXL']
const rule = (dx = 0, dy = 0) => ({mode:'small-large-incremental',sizes:[...sizes],baseSize:'M',
  steps: Array.from({length:5},()=>({dx,dy}))})
const rect = (id,shift,notchT) => ({id,points:[
  {x:shift,y:0,industrialGradeRule:rule()},
  {x:shift+20,y:0,industrialGradeRule:rule(1)},
  {x:shift+20,y:10,industrialGradeRule:rule(1)},
  {x:shift,y:10,industrialGradeRule:rule()},
],notches:[{id:`${id}-n`,edgeIndex:0,t:notchT,matchGroupId:'pair',matchedSeamId:'join'}]})
const fixture = (source=.52,target=.5) => ({revision:11,id:'test',
  grading:{sizes:[...sizes],baseSize:'M'},pieces:[rect('a',0,source),rect('b',40,target)],
  seams:[{id:'join',a:{pieceId:'a',edgeIndex:0},b:{pieceId:'b',edgeIndex:0}}]})

test('corrects one target seam notch physically across six graded straight sizes in an atomic draft',()=>{
  const project=fixture(),original=structuredClone(project)
  assert.throws(()=>buildSewnIndustrialSizeRun20261024(project),/NOTCH_STATION_MISMATCH/)
  const result=trueNotches(project,{expectedRevision:11})
  assert.equal(result.changed,true)
  assert.equal(result.candidateRevision,12)
  assert.equal(result.candidate.pieces[0].notches[0].t,.52)
  assert(Math.abs(result.candidate.pieces[1].notches[0].t-.52)<1e-9)
  assert.equal(result.groups[0].perSize.length,6)
  assert(result.groups[0].perSize.every(d=>d.afterDriftCm <.00001))
  assert.equal(result.checkCount,12)
  assert.equal(result.committedToRustProject,false)
  assert.equal(result.manufacturingApproved,false)
  assert.deepEqual(project,original)
  assert.equal(buildSewnIndustrialSizeRun20261024(result.candidate).validation.status,'pass')
  const second=trueNotches(result.candidate,{expectedRevision:12})
  assert.equal(second.changed,false)
  assert.equal(second.candidateRevision,12)
})

test('uses true quadratic arclength rather than raw control-point parameter for partial seams',()=>{
  const project=fixture(.47,.52)
  project.pieces[0].curves={'0':{cx:6,cy:-5}}
  project.pieces[1].curves={'0':{cx:46,cy:-5}}
  project.seams[0].a.startT=.1;project.seams[0].a.endT=.9
  project.seams[0].b.startT=.1;project.seams[0].b.endT=.9
  const result=trueNotches(project,{expectedRevision:11})
  assert.equal(result.changed,true)
  assert(Math.abs(result.candidate.pieces[1].notches[0].t-.47)<1e-5)
  assert(result.groups[0].perSize.every(d=>d.afterDriftCm<=.02))
  assert.equal(buildSewnIndustrialSizeRun20261024(result.candidate).validation.status,'pass')
})

test('handles explicitly reversed matched orientation and retains sewn interval boundaries',()=>{
  const project=fixture(.32,.6)
  project.seams[0].reverseB=true
  project.seams[0].a.startT=.1;project.seams[0].a.endT=.9
  project.seams[0].b.startT=.1;project.seams[0].b.endT=.9
  const result=trueNotches(project,{expectedRevision:11})
  assert.equal(result.changed,true)
  assert(Math.abs(result.candidate.pieces[1].notches[0].t-.68)<1e-9)
  assert.equal(buildSewnIndustrialSizeRun20261024(result.candidate).validation.status,'pass')
})

test('rejects a false common notch station when each graded size requires a different location',()=>{
  const project=fixture(.3,.6),original=structuredClone(project)
  project.pieces[1].points[1].industrialGradeRule=rule(1.006)
  project.pieces[1].points[2].industrialGradeRule=rule(1.006)
  const before=structuredClone(project)
  assert.throws(()=>trueNotches(project,{expectedRevision:11,notchToleranceCm:.0001}),/no common six-size notch station/)
  assert.deepEqual(project,before)
  assert.notDeepEqual(project,original)
})

test('rejects unsafe input, forged metadata, stale revisions, mismatched sewing and excessive movement',()=>{
  const p=fixture(),before=structuredClone(p)
  assert.throws(()=>trueNotches(p,{expectedRevision:12}),/stale/)
  assert.throws(()=>trueNotches(p,{expectedRevision:11,maxDisplacementCm:.1}),/displacement exceeds/)
  assert.throws(()=>trueNotches(p,{expectedRevision:11,notchToleranceCm:.5}),/tolerance/)
  assert.throws(()=>trueNotches({...p, grading:{sizes:['XS','S','M'],baseSize:'M'}},{expectedRevision:11}),/six-size/)
  const crossed=structuredClone(p)
  crossed.seams[0].b.edgeIndex=1
  assert.throws(()=>trueNotches(crossed,{expectedRevision:11}),/does not match both sewn edges/)
  const mismatched=structuredClone(p)
  mismatched.pieces[1].points[1].industrialGradeRule=rule(2)
  assert.throws(()=>trueNotches(mismatched,{expectedRevision:11}),/seam mismatch/)
  const poisoned=structuredClone(p)
  poisoned.pieces[0].notches[0].gradeArcStation={distanceCm:2}
  assert.throws(()=>trueNotches(poisoned,{expectedRevision:11}),/UNSUPPORTED_NOTCH_METADATA|UNVERIFIED_NOTCH_CACHE|Invalid grade arc station/)
  const getter=fixture()
  Object.defineProperty(getter.pieces[0].points[0],'x',{get(){throw Error('getter executed')},enumerable:true})
  assert.throws(()=>trueNotches(getter,{expectedRevision:11}),e=>!e.message.includes('getter executed'))
  assert.deepEqual(p,before)
})

test('two independent notch groups are corrected in one transaction, or neither is returned',()=>{
  const source=fixture(.52,.5)
  source.pieces[0].notches.push({id:'a-second',edgeIndex:0,t:.68,matchGroupId:'pair2',matchedSeamId:'join'})
  source.pieces[1].notches.push({id:'b-second',edgeIndex:0,t:.65,matchGroupId:'pair2',matchedSeamId:'join'})
  const original=structuredClone(source)
  const result=trueNotches(source,{expectedRevision:11})
  assert.equal(result.groups.length,2)
  assert.equal(result.candidateRevision,12)
  assert(Math.abs(result.candidate.pieces[1].notches[0].t-.52)<1e-8)
  assert(Math.abs(result.candidate.pieces[1].notches[1].t-.68)<1e-8)
  assert.equal(result.checkCount,18)
  assert.deepEqual(source,original)
  const impossible=structuredClone(source)
  impossible.pieces[1].notches[1].t=.05
  assert.throws(()=>trueNotches(impossible,{expectedRevision:11}),/displacement exceeds/)
  assert.equal(impossible.revision,11)
  const duplicate=structuredClone(source)
  duplicate.pieces[0].notches.push({...duplicate.pieces[0].notches[0],id:'other'})
  assert.throws(()=>trueNotches(duplicate,{expectedRevision:11}),/incomplete or duplicate matched-notch pair/)
})
