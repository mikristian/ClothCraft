import test from 'node:test'
import assert from 'node:assert/strict'
import {auditGrice2D3DPreparation20261027 as audit} from './griceModaris2Dto3DReadiness20261027.js'

const fabric=()=>({id:'cotton',name:'Woven sample',properties:{warp:100,weft:80,shear:40,compression_ratio:.5,compression_transition:.2,bend_warp:.00008,bend_weft:.00004,density:.2,thickness:.001}})
const panel=(id,length=.2)=>({id,name:id,fabric:'cotton',grain_degrees:0,polygon:{points:[[0,0],[length,0],[length,.2],[0,.2]],edges:['top','right','bottom','left'],curves:{},notches:{top:[{t:.5}]},seam_allowances:{top:.01,right:.01,bottom:.01,left:0}}})
const snapshot=()=>({revision:12,template:{name:'Two panels',panels:[panel('front'),panel('back')],fabrics:[fabric()],seams:[{id:'join',a:{panel:'front',edge:'top',range:[0,1]},b:{panel:'back',edge:'top',range:[0,1]},allow_ease:false}]},positions:[[0,0,0],[.2,0,0],[0,.2,0],[.2,.2,0],[.3,0,0],[.5,0,0]],uv:[[0,0],[.2,0],[0,.2],[.2,.2],[.3,0],[.5,0]],triangles:[[0,1,2],[2,1,3],[1,4,5]],panels:[{id:'front',vertices:[0,4],triangles:[0,2]},{id:'back',vertices:[4,6],triangles:[2,3]}],seams:[{id:'join',gap_m:0}]})

test('validated native authored/industrial/assembly/drape source passes without factory approval',()=>{
 const s=snapshot(),original=structuredClone(s)
 const r=audit(s,{expectedRevision:12})
 assert.equal(r.readyFor3D,true)
 assert.equal(r.manufacturingApproved,false)
 assert.equal(r.modarisClassic3DWorkflowComplete,false)
 assert(r.missingModarisWorkflowEvidence.some(s=>s.includes('variant')))
 assert.equal(r.sourceRevision,12)
 assert.deepEqual(r.seams.map(x=>x.mismatchMm),[0])
 assert.deepEqual(s,original)
 assert.equal(r.stages.assembly.status,'pass')
})
test('stale revision fails closed',()=>{
 const r=audit(snapshot(),{expectedRevision:11})
 assert.equal(r.readyFor3D,false)
 assert.match(r.blockers.join(' '),/Stale native revision/)
})
test('overlapping sewing intervals on a common edge fail closed',()=>{
 const s=snapshot()
 s.template.seams.push({id:'other',a:{panel:'front',edge:'top',range:[.4,.8]},b:{panel:'back',edge:'bottom',range:[.4,.8]}})
 s.seams.push({id:'other'})
 const r=audit(s)
 assert.equal(r.readyFor3D,false)
 assert.match(r.blockers.join(' '),/overlapping seam intervals/)
})
test('physical mismatch fails unless explicit easing, which requires review',()=>{
 const s=snapshot()
 s.template.panels[1]=panel('back',.21)
 let r=audit(s)
 assert.equal(r.seams[0].mismatchMm>2,true)
 assert.equal(r.stages.assembly.status,'blocked')
 s.template.seams[0].allow_ease=true
 r=audit(s)
 assert.equal(r.stages.assembly.status,'review')
 assert.equal(r.readyFor3D,false)
 assert.match(r.warnings.join(' '),/explicit ease/)
})
test('equal total seam lengths cannot hide mismatched facing-notch stations',()=>{
 const s=snapshot(),original=structuredClone(s)
 s.template.seams[0].notches=[[.25,.5]]
 const report=audit(s,{expectedRevision:12})
 assert.equal(report.seams[0].mismatchMm,0,'Total sewn lengths deliberately match')
 assert.equal(report.seams[0].notchIntervals.length,2)
 assert(report.seams[0].localNotchMismatchMm>40)
 assert.equal(report.seams[0].status,'blocked')
 assert.match(report.blockers.join(' '),/local facing-notch interval mismatch/)
 assert.equal(report.readyFor3D,false)
 assert.deepEqual(s.template.panels,original.template.panels)
})
test('declared local ease downgrades mismatched notch stations to review, never approval',()=>{
 const s=snapshot()
 s.template.seams[0].notches=[[.25,.5]]
 s.template.seams[0].allow_ease=true
 const r=audit(s)
 assert.equal(r.seams[0].mismatchMm,0)
 assert.equal(r.seams[0].status,'review')
 assert.equal(r.stages.assembly.status,'review')
 assert.equal(r.readyFor3D,false)
 assert.equal(r.manufacturingApproved,false)
})
test('nonmonotone or out-of-range physical seam notch pairs fail closed',()=>{
 const cases=[[[.6,.4],[.5,.8]],[[0,.5]],[[.2,1]],[[Number.NaN,.5]],[[.5]],'invalid']
 for(const notches of cases){
  const s=snapshot()
  s.template.seams[0].notches=notches
  const r=audit(s)
  assert.equal(r.readyFor3D,false,JSON.stringify(notches))
  assert.match(r.blockers.join(' '),/invalid or nonmonotone facing-notch/,JSON.stringify(notches))
 }
})
test('matched interior sewing correspondence stations preserve two physical intervals',()=>{
 const s=snapshot()
 s.template.seams[0].notches=[[.4,.4]]
 const r=audit(s)
 assert.equal(r.status,'pass')
 assert.equal(r.seams[0].notchIntervals.length,2)
 assert.equal(r.seams[0].notchIntervals[0].aMm,80)
 assert.equal(r.seams[0].notchIntervals[1].bMm,120)
 assert.equal(r.seams[0].localNotchMismatchMm,0)
})
test('missing compiled mesh and invalid fabric properties fail independently',()=>{
 const s=snapshot();delete s.triangles;s.template.fabrics[0].properties.warp=0
 const r=audit(s)
 assert.equal(r.readyFor3D,false)
 assert.match(r.blockers.join(' '),/mesh triangles/)
 assert.match(r.blockers.join(' '),/warp/)
})
test('invalid notch t and unknown cubic geometry fail closed',()=>{
 const s=snapshot();s.template.panels[0].polygon.notches.top[0].t=1.2
 s.template.panels[1].polygon.curves.top=[[NaN,0],[.1,0]]
 const r=audit(s)
 assert.equal(r.readyFor3D,false)
 assert.match(r.blockers.join(' '),/invalid notch/)
 assert.match(r.blockers.join(' '),/unmeasurable/)
})
test('partial physical sewing ranges are measured in millimeters',()=>{
 const s=snapshot()
 s.template.seams[0].a.range=[.25,.75]
 s.template.seams[0].b.range=[.25,.75]
 const r=audit(s)
 assert.equal(r.readyFor3D,true)
 assert.ok(Math.abs(r.seams[0].a.lengthMm-100)<1e-8)
})
test('absence of authored sewing cannot claim assembled 3D readiness',()=>{
 const s=snapshot();s.template.seams=[];s.seams=[]
 const r=audit(s)
 assert.equal(r.status,'blocked')
 assert.equal(r.readyFor3D,false)
 assert.match(r.blockers.join(' '),/No authored sewing joins/)
})
test('undocumented industrial marks require review even with otherwise valid mesh',()=>{
 const s=snapshot();delete s.template.panels[0].polygon.notches
 const r=audit(s)
 assert.equal(r.status,'review')
 assert.equal(r.stages.industrial.status,'review')
 assert.equal(r.readyFor3D,false)
})
test('book chapter 4: a single allowance does not prove all four cut/stitched edges',()=>{
 const s=snapshot()
 s.template.panels[0].polygon.seam_allowances={top:.01}
 const r=audit(s)
 assert.equal(r.stages.industrial.status,'review')
 assert.equal(r.readyFor3D,false)
 assert.match(r.warnings.join(' '),/3 boundary edge\(s\).*no explicit seam allowance/)
 assert.equal(r.manufacturingApproved,false)
})
