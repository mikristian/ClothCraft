import {test} from 'node:test'
import assert from 'node:assert/strict'
import {buildSewingAssemblyWorkflow20261024 as build,applySewingAssemblyAction20261024 as apply} from './sewingAssemblyWorkflow20261024.js'
import {createDefaultProject} from '../data/defaultProject.js'

const piece=(id,points=[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}])=>
  ({id,name:id,points,active3d:true,curves:{}})
const edge=(pieceId,edgeIndex,startT,endT)=>({pieceId,edgeIndex,
  ...(startT===undefined?{}:{startT,endT})})
const seam=(id,a,b,name=id)=>({id,name,a,b,reverseB:false})
const project=()=>({revision:5,pieces:[piece('front'),piece('back')],seams:[],
  grading:{sizes:['S','M','L'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0}})
const create=(p,id,a,b)=>apply(p,{kind:'seam.create',id,name:id,a,b})

test('treatment edit rejects an imported overlapping seam without modifying the source',()=>{
  const p=project()
  p.seams=[
    seam('original',edge('front',0),edge('back',0)),
    seam('conflict',edge('front',0,0.2,0.8),edge('back',1,0.2,0.8)),
  ]
  const before=structuredClone(p)
  const result=apply(p,{kind:'seam.update',seamId:'conflict',field:'reverseB',value:true})
  assert.equal(result.ok,false)
  assert.equal(result.code,'INVALID_EXISTING_SEAM')
  assert.deepEqual(p,before)
})

test('guarded create produces a real, immutable segment sewing relationship',()=>{
  const p=project(),original=structuredClone(p)
  const result=create(p,'join',edge('front',0),edge('back',0))
  assert.equal(result.ok,true,JSON.stringify(result))
  assert.equal(result.project.seams.length,1)
  assert.equal(result.seam.id,'join')
  assert.equal(result.project.revision,6)
  assert.deepEqual(p,original)
  const review=build(result.project)
  assert.equal(review.assemblyReady,true,JSON.stringify(review.issues))
  assert.equal(review.steps.length,1)
  assert.equal(review.steps[0].relation,'join-panels')
  assert.deepEqual(review.checkedSizes,['S','M','L'])
  assert.equal(review.manufacturingApproved,false)
})

test('true curved and partially sewn segments use physical quadratic arc length',()=>{
  const p=project()
  p.pieces[0].curves={0:{cx:5,cy:-3}}
  p.pieces[1].curves={0:{cx:5,cy:-3}}
  const a=edge('front',0,.1,.7),b=edge('back',0,.1,.7)
  const added=create(p,'partial',a,b)
  assert.equal(added.ok,true,added.detail)
  assert.equal(added.seam.useExactCorrespondence,true)
  const r=build(added.project)
  assert.equal(r.assemblyReady,true,JSON.stringify(r.issues))
  assert.equal(r.steps[0].partial,true)
  assert.ok(r.steps[0].sourceLengthCm>6,'arc length exceeds straight interval length')
  assert.ok(Math.abs(r.steps[0].sourceLengthCm-r.steps[0].targetLengthCm)<1e-8)
})

test('overlapping sewing selection rejects atomically while adjacent partial ranges work',()=>{
  const p=project()
  const first=create(p,'first',edge('front',0,0,.5),edge('back',0,0,.5))
  assert.equal(first.ok,true)
  const before=structuredClone(first.project)
  const rejected=create(first.project,'duplicate',edge('front',0,.25,.75),edge('back',1,0,.6))
  assert.equal(rejected.ok,false)
  assert.equal(rejected.code,'INVALID_SEAM_CONNECTION')
  assert.deepEqual(first.project,before)
  const adjacent=create(first.project,'second',edge('front',0,.5,1),edge('back',0,.5,1))
  assert.equal(adjacent.ok,true,adjacent.detail)
  assert.equal(build(adjacent.project).assemblyReady,true)
})

test('graded mismatch blocks simulated assembly even when base size matches',()=>{
  const p=project()
  p.pieces[0].points[1].gradeRule={enabled:true,dxPerSize:2,dyPerSize:0}
  p.seams=[seam('side',edge('front',0),edge('back',0))]
  const report=build(p)
  assert.equal(report.assemblyReady,false)
  assert.ok(report.issues.some(issue=>issue.code==='GRADED_SEAM_MISMATCH'),JSON.stringify(report.issues))
  assert.equal(report.steps[0].matches,true)
})

test('self-sewn edges, disconnected groups and multi-stage deterministic order are distinguished',()=>{
  const p=project()
  p.pieces.push(piece('sleeve'),piece('orphan'))
  p.seams=[
    seam('underarm',edge('sleeve',1),edge('sleeve',3),'Sleeve underarm'),
    seam('shoulder',edge('front',0),edge('back',0),'Shoulder'),
  ]
  const report=build(p,{checkGrading:false})
  assert.equal(report.steps[0].seamId,'shoulder')
  assert.equal(report.steps[0].relation,'join-panels')
  assert.equal(report.steps[1].relation,'self-sew')
  assert.equal(report.assemblyReady,false)
  assert.ok(report.issues.some(issue=>issue.code==='DISCONNECTED_ASSEMBLY'))
})

test('source invalidity, active3d exclusion and malformed endpoint fail closed',()=>{
  const p=project()
  p.pieces[1].active3d=false
  p.seams=[seam('connection',edge('front',0),edge('back',0))]
  assert.ok(build(p).issues.some(issue=>issue.code==='INACTIVE_3D_PIECE'))
  p.seams[0].b.edgeIndex=77
  assert.ok(build(p).issues.some(issue=>issue.code==='INVALID_SEWN_EDGE'))
  const invalid=apply(p,{kind:'seam.create',id:'bad',name:'bad',a:edge('front',1),b:edge('back',88)})
  assert.equal(invalid.ok,false)
  assert.equal(p.seams.length,1)
})

test('saved seam treatment errors fail assembly readiness rather than appearing sewn',()=>{
  const p=project()
  p.seams=[seam('join',edge('front',0),edge('back',0))]
  p.seams[0].type='unknown-sew-type'
  assert.ok(build(p).issues.some(i=>i.code==='INVALID_SEAM_TREATMENT'))
  p.seams[0].type='zipper'
  p.seams[0].openFraction=2
  assert.equal(build(p).assemblyReady,false)
  p.seams[0].openFraction=.5
  assert.equal(build(p).assemblyReady,true)
})

test('matched notches retain source references and prevent dangling seam deletion',()=>{
  const p=project()
  p.seams=[seam('join',edge('front',0),edge('back',0))]
  p.pieces[0].notches=[{edgeIndex:0,t:.25,matchedSeamId:'join'}]
  const before=structuredClone(p)
  const blocked=apply(p,{kind:'seam.delete',seamId:'join'})
  assert.equal(blocked.code,'MATCHED_NOTCHES_REQUIRE_REMAP')
  assert.deepEqual(p,before)
  p.pieces[0].notches=[]
  const deleted=apply(p,{kind:'seam.delete',seamId:'join'})
  assert.equal(deleted.ok,true,deleted.detail)
  assert.deepEqual(deleted.project.seams,[])
  assert.equal(p.seams.length,1)
})

test('sewing treatment edits commit valid values and reject incompatible settings atomically',()=>{
  const p=project()
  p.seams=[seam('join',edge('front',0),edge('back',0))]
  const before=structuredClone(p)
  const rejected=apply(p,{kind:'seam.update',seamId:'join',field:'ratio',value:.4})
  assert.equal(rejected.code,'INCOMPATIBLE_SEAM_TREATMENT')
  assert.deepEqual(p,before)
  const eased=apply(p,{kind:'seam.update',seamId:'join',field:'type',value:'ease'})
  assert.equal(eased.ok,true,eased.detail)
  assert.equal(eased.seam.ratio,.96)
  const adjusted=apply(eased.project,{kind:'seam.update',seamId:'join',field:'ratio',value:.83})
  assert.equal(adjusted.ok,true,adjusted.detail)
  assert.equal(adjusted.seam.ratio,.83)
  assert.equal(apply(adjusted.project,{kind:'seam.update',seamId:'join',field:'ratio',value:NaN}).ok,false)
  const normal=apply(adjusted.project,{kind:'seam.update',seamId:'join',field:'type',value:'normal'})
  assert.equal(normal.ok,true,normal.detail)
  assert.equal(Object.hasOwn(normal.seam,'ratio'),false)
  assert.equal(p.seams[0].type,undefined)
  assert.equal(p.revision,5)
})

test('reverse direction is editable while geometry and original remain unchanged',()=>{
  const p=project()
  p.seams=[seam('join',edge('front',0),edge('back',0))]
  const old=JSON.stringify(p)
  const reversed=apply(p,{kind:'seam.update',seamId:'join',field:'reverseB',value:true})
  assert.equal(reversed.ok,true,reversed.detail)
  assert.equal(reversed.seam.reverseB,true)
  assert.deepEqual(reversed.project.pieces,p.pieces)
  assert.equal(JSON.stringify(p),old)
})

test('untrusted getter, inherited toJSON and cyclic graphs are rejected or copied without invocation',()=>{
  let called=0
  const p=project()
  Object.defineProperty(p.pieces[0].points[0],'x',{get(){called++;throw Error('GETTER EXECUTED')}})
  assert.equal(build(p).assemblyReady,false)
  assert.equal(apply(p,{kind:'seam.delete',seamId:'missing'}).ok,false)
  assert.equal(called,0)
  const clean=project()
  const original=Object.prototype.toJSON
  try{
    Object.prototype.toJSON=function(){called++;throw Error('toJSON invoked')}
    const r=create(clean,'join',edge('front',0),edge('back',0))
    assert.equal(r.ok,true,r.detail)
    assert.equal(called,0)
  }finally{
    if(original===undefined)delete Object.prototype.toJSON
    else Object.prototype.toJSON=original
  }
  clean.cycle=clean
  assert.equal(build(clean).assemblyReady,false)
  assert.equal(called,0)
})

test('default EXO garment assembly reports real sleeve issues across graded sizes',()=>{
  const p=createDefaultProject()
  const before=structuredClone(p)
  const review=build(p)
  assert.equal(review.stepCount,p.seams.length)
  assert.equal(review.checkedSizes.length,p.grading.sizes.length)
  assert.ok(review.steps.some(s=>s.name==='Left shoulder'))
  assert.ok(review.issues.some(i=>i.code==='SEAM_LENGTH_MISMATCH'))
  assert.equal(review.assemblyReady,false)
  assert.equal(review.manufacturingApproved,false)
  assert.deepEqual(p,before)
})
test('stale revision rejects create, edit and delete without changing authored project',()=>{
  const p=project();p.seams=[seam('join',edge('front',0),edge('back',0))]
  const before=structuredClone(p)
  for(const action of [
    {kind:'seam.create',id:'another',name:'another',a:edge('front',1),b:edge('back',1)},
    {kind:'seam.update',seamId:'join',field:'reverseB',value:true},
    {kind:'seam.delete',seamId:'join'}]){
    const result=apply(p,{...action,expectedRevision:4})
    assert.equal(result.code,'STALE_SEWING_REVISION')
    assert.deepEqual(p,before)
  }
  assert.equal(apply(p,{kind:'seam.update',seamId:'join',field:'reverseB',value:true,expectedRevision:5}).ok,true)
})
test('imported partial seams require explicit correspondence and treatment field correctness',()=>{
  const p=project()
  p.seams=[seam('partial',edge('front',0,.1,.8),edge('back',0,.1,.8))]
  assert.ok(build(p,{checkGrading:false}).issues.some(x=>x.code==='MISSING_PARTIAL_CORRESPONDENCE'))
  p.seams[0].useExactCorrespondence=true
  assert.equal(build(p,{checkGrading:false}).assemblyReady,true)
  p.seams[0].useExactCorrespondence='yes'
  assert.ok(build(p,{checkGrading:false}).issues.some(x=>x.code==='INVALID_SEAM_CORRESPONDENCE'))
})

test('malformed saved seam treatment metadata cannot become assembly ready',()=>{
  const p=project()
  p.seams=[seam('join',edge('front',0),edge('back',0))]
  const variants=[
    {type:'normal',ratio:.7},
    {type:'normal',easeSide:'a'},
    {type:'binding',gatherSide:'b'},
    {type:'ease',openFrom:'start'},
    {type:'elastic',openFraction:.2},
    {type:'zipper',ratio:.7},
    {type:'normal',name:12},
  ]
  for(const fields of variants){
    p.seams[0]={...seam('join',edge('front',0),edge('back',0)),...fields}
    const report=build(p,{checkGrading:false})
    assert.equal(report.assemblyReady,false,JSON.stringify(fields))
    assert.ok(report.issues.some(x=>x.code==='INVALID_SEAM_TREATMENT'||x.code==='ASSEMBLY_PREFLIGHT_FAILED'),JSON.stringify(fields))
  }
})

test('blocked connections do not merge assembly groups or mislabel later joins',()=>{
  const p=project()
  p.pieces.push(piece('sleeve'))
  p.seams=[
    {...seam('bad',edge('front',0),edge('back',0),'Shoulder'),type:'invalid'},
    seam('valid',edge('back',1),edge('sleeve',1),'Sleeve')
  ]
  const report=build(p,{checkGrading:false})
  assert.equal(report.assemblyReady,false)
  assert.equal(report.steps.find(x=>x.seamId==='bad').blocked,true)
  assert.equal(report.steps.find(x=>x.seamId==='valid').relation,'join-panels')
  assert.deepEqual(report.components,[['front'],['back','sleeve']])
  assert.ok(report.issues.some(x=>x.code==='DISCONNECTED_ASSEMBLY'))
})
