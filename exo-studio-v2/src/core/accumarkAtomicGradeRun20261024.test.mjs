import test from 'node:test'
import assert from 'node:assert/strict'
import {applyAccuMarkAtomicGradeRun20261024 as apply} from './accumarkAtomicGradeRun20261024.js'
import {gradeProject} from './grading.js'
import {evaluateIndustrialGradeTable} from './industrialGradeRules.js'
const sizes=['S','M','L','XL']
const fixture=()=>({id:'grading-authored-v1',revision:1,
 grading:{sizes:[...sizes],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},
 pieces:[{id:'front',name:'Front pattern',points:[
  {id:'a',x:0,y:0},{id:'b',x:10,y:0},{id:'c',x:10,y:8},{id:'d',x:0,y:8}],
  cutQuantity:1,fabricId:'main'},{
  id:'back',name:'Back pattern',points:[
   {id:'e',x:20,y:0},{id:'f',x:30,y:0},{id:'g',x:30,y:8},{id:'h',x:20,y:8}]}],
 seams:[]})
const increments=[-1,0,2,4]
const offsets=values=>sizes.map((size,i)=>({size,dxCm:values[i],dyCm:0}))
const spec=()=>({edits:[
 {pieceId:'front',pointIndex:1,offsetsCm:offsets(increments)},
 {pieceId:'front',pointIndex:2,offsetsCm:offsets(increments)},
 {pieceId:'back',pointIndex:1,offsetsCm:offsets([-.25,0,.75,1.25])},
 {pieceId:'back',pointIndex:2,offsetsCm:offsets([-.25,0,.75,1.25])},
]})
test('commits full nonuniform size-break tables atomically across several detached pattern pieces',()=>{
 const p=fixture(),before=structuredClone(p)
 const result=apply(p,spec())
 assert.equal(result.ok,true)
 assert.equal(result.validation.editedPointCount,4)
 assert.equal(result.validation.sizeCount,4)
 assert.equal(result.preview.length,4)
 assert(result.preview.every(row=>row.passedPieceCount===2))
 for(let i=0;i<sizes.length;i++){
  const size=sizes[i],draft=gradeProject(result.project,size)
  assert.equal(draft.pieces[0].points[1].x,10+increments[i])
  assert.equal(draft.pieces[1].points[1].x,30+[-.25,0,.75,1.25][i])
  assert.equal(draft.pieces[0].points[0].x,0)
  const table=evaluateIndustrialGradeTable(result.project.pieces[0].points[1].industrialGradeRule)
  assert.equal(table[size].dx,increments[i])
 }
 assert.deepEqual(p,before)
 assert.equal(result.manufacturingApproved,false)
 assert.equal(result.factoryApproved,false)
 assert.equal(result.validation.factoryCertified,false)
})
test('grade transaction rejects self-crossing geometry before returning a project',()=>{
 const p=fixture(),s=spec()
 s.edits[0].offsetsCm=offsets([-25,0,2,4])
 assert.throws(()=>apply(p,s),/POST_EDIT_INDUSTRIAL_QA_BLOCKED/)
 assert.equal(p.pieces[0].points[1].industrialGradeRule,undefined)
})
test('rejects missing size rows, duplicate target and nonzero base offsets without mutation',()=>{
 const p=fixture(),old=structuredClone(p)
 for(const mutate of [
  s=>s.edits[0].offsetsCm.pop(),
  s=>s.edits.push(structuredClone(s.edits[0])),
  s=>s.edits[0].offsetsCm[1].dxCm=1,
  s=>s.edits[0].offsetsCm[2].size='XXL',
  s=>s.edits[1].pointIndex=99,
 ]){const bad=spec();mutate(bad);assert.throws(()=>apply(p,bad))}
 assert.deepEqual(p,old)
})
test('blocks sewn seams, physical notch stations, curves and dependencies instead of dropping their meaning',()=>{
 for(const mutate of [
  p=>p.seams.push({id:'waist'}),
  p=>p.pieces[0].curves={'1':{cx:11,cy:5}},
  p=>p.pieces[0].notches=[{id:'anchor',edgeIndex:1,t:.5}],
  p=>p.pieces[0].internalLines=[{id:'ink',a:{x:0,y:0},b:{x:10,y:1}}],
  p=>p.pieces[0].points[1].namedGradeRuleRef={id:'G-2'},
  p=>p.customMeasurements=[{id:'waist',pieceId:'front',a:{x:0,y:0},b:{x:1,y:1}}],
  p=>p.productionSpec={gradingModel:'seam-locked-affine-v1'},
 ]){
  const p=fixture();mutate(p)
  assert.throws(()=>apply(p,spec()))
 }
})
test('absence of authored seam inventory is a source blocker, never interpreted as zero seams',()=>{
 const project=fixture();delete project.seams
 assert.throws(()=>apply(project,spec()),/EXPLICIT_SEAM_SOURCE_REQUIRED/)
})
test('supports a second independent edit of an already committed null-prototype source transaction',()=>{
 const p=fixture()
 const first=apply(p,spec())
 const second=apply(first.project,{edits:[{pieceId:'front',pointIndex:1,
   offsetsCm:offsets([-1,0,1,3])}]})
 assert.equal(second.ok,true)
 assert.equal(gradeProject(second.project,'L').pieces[0].points[1].x,11)
 assert.equal(gradeProject(first.project,'L').pieces[0].points[1].x,12)
 assert.deepEqual(p,fixture())
})
test('source grade must never silently leave unknown anchored point metadata stale',()=>{
 const p=fixture()
 p.pieces[0].points[1].customAttachment={anchor:{x:10,y:0},kind:'stitch-station'}
 assert.throws(()=>apply(p,spec()),/UNKNOWN_POINT_ATTACHMENT_REQUIRES_COEDIT/)
})
test('malicious accessors, inherited polluted toJSON, symbols and cycles never execute silently',()=>{
 let called=0;const p=fixture()
 Object.defineProperty(p.pieces[0].points[1],'x',{get(){called++;throw Error('EXECUTED')}})
 assert.throws(()=>apply(p,spec()),/SOURCE_ACCESSOR_OR_HIDDEN_FIELD/)
 assert.equal(called,0)
 const own=fixture();own[Symbol('provenance')]='hidden'
 assert.throws(()=>apply(own,spec()),/UNSAFE_SOURCE_FIELDS/)
 const cycle=fixture();cycle.self=cycle
 assert.throws(()=>apply(cycle,spec()),/SOURCE_COMPLEXITY_OR_CYCLE/)
 const desc=Object.getOwnPropertyDescriptor(Object.prototype,'toJSON')
 try{
  Object.defineProperty(Object.prototype,'toJSON',{value(){called++;throw Error('POLLUTED')},configurable:true})
  assert.throws(()=>apply(fixture(),spec()),/POLLUTED_SERIALIZER_PROTOTYPE/)
  assert.equal(called,0)
 }finally{
  if(desc)Object.defineProperty(Object.prototype,'toJSON',desc)
  else delete Object.prototype.toJSON
 }
})
test('rejects grade-point operation on unsupported large projects and extreme breaks',()=>{
 const p=fixture()
 p.grading.sizes=Array.from({length:25},(_,i)=>'S'+i)
 assert.throws(()=>apply(p,spec()),/INVALID_SIZE_RUN/)
 const extreme=spec();extreme.edits[0].offsetsCm[2].dxCm=70
 assert.throws(()=>apply(fixture(),extreme),/GRADE_BREAK_EXCEEDS_LIMIT/)
})
