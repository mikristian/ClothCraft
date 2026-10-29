import test from 'node:test'
import assert from 'node:assert/strict'
import {buildNativeVerifiedSinglePlyRollPlanRun44 as build,
  inspectNativeVerifiedSinglePlyRollPlanRun44 as inspect}
  from './native-verified-single-ply-roll-plan-run44.mjs'

// Fully isolated synthetic Rust-workspace protocol fixture: no native EXO
// process, no user garment, no physical machine and no disk writes.
const sizes=['S','M']
const panels=[
  {id:'shell-front',name:'Front',fabric:'shell',grain_degrees:0},
  {id:'lining-back',name:'Back',fabric:'lining',grain_degrees:0},
]
const project={template:{panels},grade_run:{sizes}}
const polygon=points=>({
  points,edges:points.map((_,i)=>({
    name:'edge-'+i,allowance_m:0.012,start:i,end:(i+1)%points.length,
  })),notches:[],
  perimeter_m:points.reduce((sum,p,i)=>{
    const q=points[(i+1)%points.length]
    return sum+Math.hypot(p[0]-q[0],p[1]-q[1])
  },0),
  area_m2:Math.abs(points.reduce((sum,p,i)=>{
    const q=points[(i+1)%points.length]
    return sum+p[0]*q[1]-q[0]*p[1]
  },0))/2,
})
const cuts={format:'exo-native-graded-cutlines.v1',cuttingAuthorized:false,
  revision:7,sourceRevision:7,manufacturerReady:false,
  sizes:sizes.map((size,i)=>({size,panels:[
    {panel_id:'shell-front',cut:polygon([[0,0],[.10+i*.005,0],[0,.08]])},
    {panel_id:'lining-back',cut:polygon([[0,0],[.08,0],[0,.07+i*.005]])},
  ]}))}
let revision=7
let cutCalls=0
const workspace={
  request:async packet=>{
    if(packet.op==='snapshot')return {ok:true,data:{
      revision,gradeRunPersisted:true,running:false,activeGradedSize:null,
      template:project.template}}
    if(packet.op==='save')return {ok:true,data:{project:structuredClone(project)}}
    if(packet.op==='grade-run-cutlines'){
      cutCalls++
      return {ok:true,data:structuredClone(cuts)}
    }
    throw Error('UNEXPECTED_NATIVE_REQUEST')
  },
}
const order=()=>({
  expectedRevision:revision,
  quantitiesBySize:{S:{'shell-front':2,'lining-back':1},
    M:{'shell-front':1,'lining-back':2}},
  materialsByPanel:{
    'shell-front':{fabricId:'shell',groupId:'shell-group'},
    'lining-back':{fabricId:'lining',groupId:'lining-group'},
  },
})
const planning=()=>({
  rollsById:{
    'ROLL-SHELL':{fabricId:'shell',groupId:'shell-group',
      usableWidthCm:150,availableLengthCm:500,
      shadeId:'NATURAL',dyeLotId:'LOT-A',batchId:'BATCH-A'},
    'ROLL-LINING':{fabricId:'lining',groupId:'lining-group',
      usableWidthCm:150,availableLengthCm:500,
      shadeId:'WHITE',dyeLotId:'LOT-B',batchId:'BATCH-B'},
  },
  assignmentsBySize:Object.fromEntries(sizes.map(size=>[size,{
    shell:{rollId:'ROLL-SHELL',endLossCm:2},
    lining:{rollId:'ROLL-LINING',endLossCm:1},
  }])),
  defectsByRoll:{
    'ROLL-SHELL':[{startCm:0,endCm:5},{startCm:50,endCm:53}],
    'ROLL-LINING':[{startCm:0,endCm:3}],
  },
})

test('native Rust-authoritative CUT and physical panel quantities plan exact one-ply roll tickets',async()=>{
  const before=JSON.stringify({project,cuts})
  const given=order(),plan=planning()
  const receipt=await build(workspace,given,plan)
  assert.equal(receipt.ok,true,JSON.stringify(receipt.issues))
  assert(cutCalls>=2)
  const {manifest}=receipt
  assert.equal(manifest.schema,'exo.native-single-ply-roll-study.v1')
  assert.equal(manifest.quantitySemantics,
    'physical-panel-cuts-on-one-native-marker-per-size-fabric')
  assert.deepEqual(manifest.unitSystem,{cutPolygonInput:'m',marker:'cm',roll:'cm'})
  assert.equal(manifest.rows.length,4)
  assert.deepEqual(manifest.rows.map(row=>row.nativeCutInstances),[1,2,2,1])
  for(const row of manifest.rows){
    assert.equal(row.plies,1)
    assert.equal(row.markerRepeats,1)
    assert.equal(row.cuttingAuthorized,undefined)
    assert(row.markerLengthCm>0&&row.endCm>row.startCm)
  }
  for(const roll of manifest.rollSummaries){
    assert.equal(roll.physicalRollVerified,false)
    assert(roll.remainingTailCm>=0)
    assert(Math.abs(roll.allocatedExtentCm-
      roll.reservedLengthCm-roll.unallocatedHeadAndGapsCm)<1e-7)
  }
  assert.equal(manifest.licensedReceivingCadVerified,false)
  assert.equal(manifest.factoryApproved,false)
  assert.equal(manifest.cuttingAuthorized,false)
  const accepted=await inspect(workspace,given,plan,{
    manifest:structuredClone(manifest),manifestSha256:receipt.manifestSha256,
  })
  assert.equal(accepted.ok,true,JSON.stringify(accepted.issues))
  assert.equal(accepted.cuttingAuthorized,false)
  assert.equal(JSON.stringify({project,cuts}),before)
})

test('native roll study refuses forged receipt, wrong roll, shifted defects, insufficient stock and source change',async()=>{
  const given=order(),plan=planning()
  const built=await build(workspace,given,plan)
  assert.equal(built.ok,true,JSON.stringify(built.issues))
  const packet={manifest:built.manifest,manifestSha256:built.manifestSha256}
  const forged=structuredClone(packet)
  forged.manifest.rows[0].startCm+=1
  assert.equal((await inspect(workspace,given,plan,forged)).ok,false)
  const wrongGroup=planning()
  wrongGroup.rollsById['ROLL-SHELL'].groupId='WRONG-GROUP'
  assert.equal((await build(workspace,given,wrongGroup)).ok,false)
  const narrow=planning()
  narrow.rollsById['ROLL-SHELL'].usableWidthCm=5
  assert.equal((await build(workspace,given,narrow)).ok,false)
  const short=planning()
  short.rollsById['ROLL-LINING'].availableLengthCm=8
  assert.equal((await build(workspace,given,short)).ok,false)
  const overlap=planning()
  overlap.defectsByRoll['ROLL-SHELL'].push({startCm:4,endCm:7})
  assert.equal((await build(workspace,given,overlap)).ok,false)
  const changedDefect=planning()
  changedDefect.defectsByRoll['ROLL-SHELL'][0].endCm=6
  const drift=await inspect(workspace,given,changedDefect,packet)
  assert.equal(drift.ok,false)
  assert.match(JSON.stringify(drift.issues),/NATIVE_ROLL_SOURCE_OR_ALLOCATION_DRIFT/)
  const earlier=project.template.panels[0].name
  try{
    project.template.panels[0].name='Changed with same revision'
    const stale=await inspect(workspace,given,plan,packet)
    assert.equal(stale.ok,false)
  }finally{project.template.panels[0].name=earlier}
  assert.equal((await inspect(workspace,given,plan,packet)).ok,true)
})

test('native rolls fail closed on invalid fields and never execute hostile accessors',async()=>{
  const given=order(),plan=planning()
  const malformed=structuredClone(plan)
  delete malformed.defectsByRoll['ROLL-LINING']
  assert.equal((await build(workspace,given,malformed)).ok,false)
  const undeclared=structuredClone(plan)
  undeclared.assignmentsBySize.S.shell.rollId='MISSING'
  assert.equal((await build(workspace,given,undeclared)).ok,false)
  let executed=0
  const hostile=planning()
  Object.defineProperty(hostile.rollsById['ROLL-SHELL'],'availableLengthCm',{
    enumerable:true,configurable:true,get(){executed++;throw Error('EXECUTED')}})
  const refused=await build(workspace,given,hostile)
  assert.equal(refused.ok,false)
  assert.equal(executed,0)
  assert.equal(refused.factoryApproved,false)
})

test('per-fabric native order cannot silently mix shade or dye lot across size rolls',async()=>{
  const multi=planning()
  multi.rollsById['ROLL-SHELL-2']={...multi.rollsById['ROLL-SHELL'],
    batchId:'BATCH-SHELL-2'}
  multi.defectsByRoll['ROLL-SHELL-2']=[]
  multi.assignmentsBySize.M.shell.rollId='ROLL-SHELL-2'
  const sameLot=await build(workspace,order(),multi)
  assert.equal(sameLot.ok,true,JSON.stringify(sameLot.issues))
  assert.equal(sameLot.manifest.rollSummaries.length,3)
  assert.equal(sameLot.manifest.cuttingAuthorized,false)
  for(const field of ['shadeId','dyeLotId']){
    const mixed=structuredClone(multi)
    mixed.rollsById['ROLL-SHELL-2'][field]='UNMATCHED'
    const blocked=await build(workspace,order(),mixed)
    assert.equal(blocked.ok,false)
    assert.match(JSON.stringify(blocked.issues),
      /NATIVE_ROLL_CROSS_SHADE_OR_DYE_LOT_WITHOUT_AUTHORED_SPLIT/)
    assert.equal(blocked.cuttingAuthorized,false)
    assert.equal(blocked.factoryApproved,false)
  }
})
