import test from 'node:test'
import assert from 'node:assert/strict'
import {verifyModarisNativeSewnReactiveWitness20261027 as verify} from './modarisNativeSewnReactiveWitness20261027.js'

const sizes=['XS','S','M','L','XL','XXL']
const offsets={XS:-.02,S:-.01,M:0,L:.01,XL:.02,XXL:.03}
const edges=['top','right','bottom','left']
const seam={id:'paired-top',a:{panel:'front',edge:'top',range:[0,1]},
  b:{panel:'back',edge:'top',range:[0,1]},reverse_b:true,allow_ease:false,
  stiffness:1,notches:[[.5,.5]]}
function panel(name,width){return {id:name,polygon:{points:[[0,0],[width,0],[width,.3],[0,.3]],
  edges,notches:{top:[{t:.5,depth_m:.004}]},
  seam_allowances:{top:.01,right:.01,bottom:.01,left:.01}}}}
function project(after){
  const panels=size=>['front','back'].map(name=>panel(name,.4+offsets[size]+(after?.02:0)))
  return {template:{panels:panels('M'),seams:[structuredClone(seam)]},grade_run:{sizes,
    gradedTemplates:sizes.map(size=>({panels:panels(size),seams:[structuredClone(seam)]}))}}
}
function cutReceipt(project,revision){return {format:'exo-native-graded-cutlines.v1',
  sourceRevision:revision,revision,manufacturerReady:false,cuttingAuthorized:false,
  sizes:project.grade_run.gradedTemplates.map((tpl,i)=>({size:sizes[i],seams:[],panels:tpl.panels.map(p=>{
    const w=p.polygon.points[1][0],h=.3,allowance=.01
    return {panel_id:p.id,sewline_edge_lengths_m:{top:w,right:h,bottom:w,left:h},
      cut:{points:[[-allowance,-allowance],[w+allowance,-allowance],[w+allowance,h+allowance],[-allowance,h+allowance]],
        edges:edges.map((name,j)=>({name,allowance_m:allowance,start:j,end:(j+1)%4})),
        area_m2:(w+allowance*2)*(h+allowance*2),perimeter_m:(w+h+allowance*4)*2,
        notches:[{edge_id:'top',t:.5,depth_m:.004,cut_start:[w*.5,-allowance],inner_end:[w*.5,-allowance+.004]}]}}
  })}))}}
function sewnReceipt(project,revision){return {format:'exo-native-six-size-sewn-balance-audit.v1',
  sourceRevision:revision,factoryApproved:false,joinedCurveMutation:false,easeReviewRequired:false,
  sizes:project.grade_run.gradedTemplates.map((tpl,i)=>{
    const width=tpl.panels[0].polygon.points[1][0]
    const side=name=>({panelId:name,edgeId:'top',interval:[0,1],reversed:name==='back',
      fullSewlineM:width,sewnIntervalM:width,cubicControlsM:null,freeCurvePointIds:[],
      notchPositionsM:[[width*.5,0]]})
    return {size:sizes[i],seams:[{seamId:'paired-top',a:side('front'),b:side('back'),
      allowEase:false,requiresEaseReview:false,mismatchM:0,
      notchIntervalLengthsM:[[width*.5,width*.5],[width*.5,width*.5]]}]}
  })}}
function fixture(){
  const beforeProject=project(false),afterProject=project(true)
  return {beforeProject,afterProject,beforeCutlines:cutReceipt(beforeProject,20),
    afterCutlines:cutReceipt(afterProject,21),beforeSewing:sewnReceipt(beforeProject,20),
    afterSewing:sewnReceipt(afterProject,21),beforeRevision:20,afterRevision:21,
    changedPanelIds:['front','back']}
}
test('sewn industrial witness joins 6 real-shaped CUT and SEW receipts and checks one revision',()=>{
  const input=fixture(),untouched=structuredClone(input)
  const proof=verify(input)
  assert.equal(proof.ok,true,proof.reason)
  assert.equal(proof.verifiedPhysicalSewnIntervals,6)
  assert.equal(proof.verifiedCutPanels,12)
  assert.equal(proof.verifiedCutNotches,12)
  assert.equal(proof.requiresEaseReview,false)
  assert.equal(proof.regeneratedPairedSewingVerified,true)
  assert.equal(proof.factoryApproved,false)
  assert.match(proof.sewnGeometryDigest,/^sha256:[0-9a-f]{64}$/)
  assert.deepEqual(input,untouched)
})
test('paired witness refuses mismatched seam intervals, forged marks and ease',()=>{
  const cases=[
    p=>{p.afterSewing.sizes[4].seams[0].b.sewnIntervalM+=.004},
    p=>{p.afterSewing.sizes[0].seams[0].a.notchPositionsM[0][0]+=.01},
    p=>{p.afterSewing.sizes[0].seams[0].notchIntervalLengthsM[0][1]+=.01},
    p=>{p.afterSewing.sizes[0].seams[0].allowEase=true},
    p=>{p.afterSewing.sizes[1].seams[0].requiresEaseReview=true},
    p=>{p.afterProject.template.seams[0].notches[0][0]=.3},
    p=>{p.afterProject.grade_run.gradedTemplates[2].seams.pop()},
    p=>{p.afterSewing.sizes[2].seams[0].b.edgeId='hem'},
    p=>{p.afterSewing.sizes[2].seams[0].b.reversed=false},
    p=>{p.afterSewing.sizes[2].seams[0].mismatchM=.0001},
    p=>{p.afterRevision=28},
  ]
  for(const [i,change] of cases.entries()){
    const input=fixture();change(input)
    const result=verify(input)
    assert.equal(result.ok,false,`Unsafe sewn case ${i} accepted: ${JSON.stringify(result)}`)
  }
})
test('native sewing witness refuses stale, ungraded, malformed manufacturing and unsupported curved attachments',()=>{
  const cases=[
    p=>{p.beforeSewing.sourceRevision=19},
    p=>{p.afterSewing.sizes.pop()},
    p=>{p.afterCutlines.sizes[2].panels[0].cut.notches=[]},
    p=>{p.afterProject.grade_run.gradedTemplates[0].panels[0].polygon.curves={top:[[0,0],[.1,.2]]}},
    p=>{p.afterCutlines.sizes[1].panels[1].sewline_edge_lengths_m.top=.1},
    p=>{p.afterProject.grade_run.gradedTemplates[1].panels[1].polygon.points[1][0]+=.002},
  ]
  for(const [i,change] of cases.entries()){
    const input=fixture();change(input)
    const result=verify(input)
    assert.equal(result.ok,false,`Unsupported receiver mutation ${i} accepted`)
  }
})
