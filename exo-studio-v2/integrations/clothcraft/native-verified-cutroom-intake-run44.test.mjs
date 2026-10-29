import assert from 'node:assert/strict'
import test from 'node:test'
import {buildNativeVerifiedCutroomIntakeRun44 as build,
  inspectNativeVerifiedCutroomIntakeRun44 as inspect,
  inspectNativeCutPolygonGeometryRun44 as geometry,
  verifyNativeCutPlacementGeometryRun44 as sameShape,
  digestNativeCutroomIntakeRun44 as sha}
  from './native-verified-cutroom-intake-run44.mjs'

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

test('metre CUT edge ownership and physically plausible notch marks fail closed',()=>{
  const plain=polygon([[0,0],[.24,0],[.24,.32],[0,.32]])
  assert.equal(geometry(plain).allowanceEdges.length,4)
  for(const modify of [
    x=>{x.edges=[]},
    x=>{x.edges[0].end=2},
    x=>{x.edges[1].start=0},
    x=>{x.edges[3].end=1},
    x=>{x.edges[0].allowance_m=.75},
    x=>{x.edges[2].name=x.edges[0].name},
    x=>{x.edges[1].start=99},
  ]){
    const invalid=structuredClone(plain)
    modify(invalid)
    assert.throws(()=>geometry(invalid),
      /NATIVE_INTAKE_INCOMPLETE_CUT_EDGE_PARTITION|NATIVE_INTAKE_INVALID_SEAM_ALLOWANCE_EDGE/)
  }
  const notch={edge_id:'edge-0',t:.5,depth_m:.005,
    cut_start:[.12,0],inner_end:[.12,.005]}
  const valid=structuredClone(plain)
  valid.notches=[notch]
  assert.equal(geometry(valid).notchMarksCm[0].depthCm,.5)
  for(const modify of [
    x=>{x.notches[0].t=0},
    x=>{x.notches[0].t=1},
    x=>{x.notches[0].depth_m=.02},
    x=>{x.notches[0].inner_end=[.12,.006]},
    x=>{x.notches[0].cut_start=[10,10]},
    x=>{x.notches[0].inner_end=[.12,-.005]},
    x=>{x.notches.push(structuredClone(x.notches[0]))},
    x=>{x.notches.push({...x.notches[0],t:.6})},
    x=>{x.notches[0].cut_start=[0,0];x.notches[0].inner_end=[0,.005]},
    x=>{x.notches[0].inner_end=[.124999,.0001];
      x.notches[0].depth_m=Math.hypot(.004999,.0001)},
    x=>{x.notches[0].edge_id='missing'},
    x=>{x.notches=[{...x.notches[0],inner_end:{x:.12,y:.005}}]},
  ]){
    const bad=structuredClone(valid)
    modify(bad)
    assert.throws(()=>geometry(bad),/NATIVE_INTAKE_/)
  }
})

test('reject clockwise, self-crossing, unit drift and non-rigid/mirrored marker contours',()=>{
  const outline=[[0,0],[.24,0],[.24,.32],[0,.32]]
  assert.throws(()=>geometry(polygon([[0,0],[0,.32],[.24,.32],[.24,0]])),
    /NATIVE_INTAKE_DEGENERATE_CUT/)
  assert.throws(()=>geometry(polygon([[0,0],[.24,.32],[0,.32],[.24,0]])),
    /NATIVE_INTAKE_SELF_INTERSECTING_CUT|NATIVE_INTAKE_DEGENERATE_CUT/)
  // No unit assertion can infer 10x scale from internally consistent length
  // figures alone; a definitely implausible 100x metre coordinate is blocked.
  const hundredfold=polygon(outline.map(([x,y])=>[x*100,y*100]))
  assert.throws(()=>geometry(hundredfold),/NATIVE_INTAKE_INVALID_METRE_COORDINATES/)
  const source=geometry(polygon(outline)).outlineCm
  const placed={rotationDeg:0,x:15,y:7,width:24,height:32,
    outline:source.map(p=>({x:p.x+15,y:p.y+7}))}
  assert.equal(sameShape(source,placed,0),true)
  const tampered=structuredClone(placed)
  tampered.outline[2].x+=.5
  tampered.width+=.5
  assert.equal(sameShape(source,tampered,0),false)
  const mirrored=structuredClone(placed)
  mirrored.outline=source.map(p=>({x:15+24-p.x,y:7+p.y}))
  assert.equal(sameShape(source,mirrored,0),false)
  const rotated=structuredClone(placed)
  rotated.rotationDeg=180
  assert.equal(sameShape(source,rotated,0),false)
  const shifted=structuredClone(placed)
  shifted.x+=1
  assert.equal(sameShape(source,shifted,0),false)
})
const project={template:{panels:[
  {id:'front',name:'Front',fabric:'shell',grain_degrees:0},
  {id:'back',name:'Back',fabric:'shell',grain_degrees:0},
]},grade_run:{sizes:['XS','M']},native_point_bindings:{active:true,anchors:[]}}
const cut={
  format:'exo-native-graded-cutlines.v1',cuttingAuthorized:false,
  revision:9,sourceRevision:9,manufacturerReady:false,
  sizes:['XS','M'].map(size=>({size,panels:[
    {panel_id:'front',cut:polygon([[0,0],[0.24,0],[0.24,0.32],[0,0.32]])},
    {panel_id:'back',cut:polygon([[0,0],[0.22,0],[0.22,0.30],[0,0.30]])},
  ]})),
}
const input={expectedRevision:9,
  quantitiesBySize:{XS:{front:1,back:1},M:{front:1,back:1}},
  materialsByPanel:{front:{fabricId:'shell',groupId:'main'},
    back:{fabricId:'shell',groupId:'main'}},
}
const observed=[]
const mock=()=>{
  const workspace={request:async packet=>{
    observed.push(packet.op)
    if(packet.op==='snapshot')return {ok:true,data:{
      revision:9,gradeRunPersisted:true,running:false,activeGradedSize:null,
      template:structuredClone(project.template),
    }}
    if(packet.op==='save')return {ok:true,data:{project:structuredClone(project)}}
    if(packet.op==='grade-run-cutlines')return {ok:true,data:structuredClone(cut)}
    throw Error('UNEXPECTED_NATIVE_RPC')
  }}
  return workspace
}
let packet
test('native Rust intake rebuilds all size/panel contours in centimetres and no factory clearance',async()=>{
  observed.length=0
  const result=await build(mock(),input)
  assert.equal(result.ok,true)
  assert.deepEqual(result.manifest.sizes,['XS','M'])
  assert.equal(result.manifest.sizeCuts.length,2)
  assert(Math.abs(result.manifest.sizeCuts[0].panels[0].physicalAreaCm2-24*32)<1e-6)
  assert.deepEqual(result.manifest.sizeCuts[0].panels[0].outlineCm[1],{x:24,y:0})
  assert.equal(result.manifest.coordinateContract.metresToCentimetres,100)
  assert.equal(result.manifest.verifiedPhysicalCutInstances,4)
  assert.equal(result.manifest.jsIndustrialProjectSourceMatched,false)
  assert.equal(result.manifest.cuttingAuthorized,false)
  assert.equal(result.manifest.factoryApproved,false)
  packet={manifest:structuredClone(result.manifest),manifestSha256:result.manifestSha256}
  const inspected=await inspect(mock(),input,packet)
  assert.equal(inspected.ok,true)
  assert.equal(inspected.physicalCutCount,4)
  assert(observed.filter(op=>op==='grade-run-cutlines').length>=4)
})

test('intake reinspection rejects changed physical CUT and recomputed unsigned client digest',async()=>{
  const original=structuredClone(cut)
  try{
    cut.sizes[0].panels[0].cut.points[1][0]+=0.001
    await assert.rejects(inspect(mock(),input,packet),
      /NATIVE_INTAKE_CUT_METROLOGY_MISMATCH|NATIVE_INTAKE_CURRENT_SOURCE_OR_ORDER_DRIFT/)
  }finally{Object.assign(cut,original)}
  const forged=structuredClone(packet)
  forged.manifest.factoryApproved=true
  forged.manifestSha256=sha(forged.manifest)
  await assert.rejects(inspect(mock(),input,forged),
    /NATIVE_INTAKE_CURRENT_SOURCE_OR_ORDER_DRIFT/)
})

test('changed linked binding identity is detected even with otherwise unchanged CUT and same revision',async()=>{
  const original=structuredClone(project.native_point_bindings)
  try{
    project.native_point_bindings.active=false
    await assert.rejects(inspect(mock(),input,packet),
      /NATIVE_INTAKE_CURRENT_SOURCE_OR_ORDER_DRIFT/)
  }finally{project.native_point_bindings=original}
})

test('fabric/quantity/group and untrusted source claims are refused without factory permission',async()=>{
  const altered=structuredClone(input)
  altered.quantitiesBySize.M.back=2
  await assert.rejects(inspect(mock(),altered,packet),
    /NATIVE_INTAKE_CURRENT_SOURCE_OR_ORDER_DRIFT/)
  const split=structuredClone(input)
  split.materialsByPanel.back.groupId='different'
  await assert.rejects(build(mock(),split),
    /DISTINCT_MARKER_GROUPS_REQUIRE_GROUP_AWARE_NATIVE_EXPORT/)
  const bad=structuredClone(packet)
  bad.manifest.coordinateContract.metresToCentimetres=10
  await assert.rejects(inspect(mock(),input,bad),/NATIVE_INTAKE_INVALID_PACKET/)
})

test('canonical digest ignores harmless object key order but never executes getters or sparse arrays',()=>{
  assert.equal(sha({b:2,a:{z:4,y:[3,1]}}),
    sha({a:{y:[3,1],z:4},b:2}))
  let called=0
  const hostile={}
  Object.defineProperty(hostile,'source',{enumerable:true,
    get(){called++;throw Error('GETTER_EXECUTED')}})
  assert.throws(()=>sha(hostile),/NATIVE_INTAKE_HASH_ACCESSOR_REFUSED/)
  assert.equal(called,0)
  const sparse=[1,,3]
  assert.throws(()=>sha(sparse),/NATIVE_INTAKE_NON_JSON_DIGEST/)
  const faux=[1,2]
  delete faux[1]
  faux.custom='malicious'
  assert.throws(()=>sha(faux),/NATIVE_INTAKE_NON_JSON_DIGEST/)
  const unsafe=JSON.parse('{"__proto__":{"factoryApproved":true}}')
  assert.throws(()=>sha(unsafe),/NATIVE_INTAKE_NON_JSON_DIGEST/)
  const cycle={};cycle.self=cycle
  assert.throws(()=>sha(cycle),/NATIVE_INTAKE_CYCLIC_DIGEST/)
})

test('native intake rejects untrusted huge physical CUT request before any Rust RPC',async()=>{
  let reads=0
  const refusing={request:async()=>{reads++;throw Error('UNEXPECTED_NATIVE_READ')}}
  const over=structuredClone(input)
  over.quantitiesBySize={}
  for(let i=0;i<50;i++){
    over.quantitiesBySize['SIZE-'+i]={}
    for(let j=0;j<10;j++)over.quantitiesBySize['SIZE-'+i]['PANEL-'+j]=20
  }
  await assert.rejects(build(refusing,over),/NATIVE_INTAKE_ORDER_INSTANCE_BUDGET/)
  assert.equal(reads,0)
  let accesses=0
  const hostile=structuredClone(input)
  Object.defineProperty(hostile.quantitiesBySize.XS,'front',{
    enumerable:true,configurable:true,
    get(){accesses++;throw Error('MALICIOUS_GETTER')},
  })
  await assert.rejects(build(refusing,hostile),/NATIVE_INTAKE_HASH_ACCESSOR_REFUSED/)
  assert.equal(accesses,0)
  assert.equal(reads,0)
})

test('pre-nest native CUT vertex and release gates refuse oversized geometry before marker compiler',async()=>{
  const old=structuredClone(cut)
  try{
    cut.sizes[0].panels[0].cut.points=Array.from({length:513},(_,i)=>[
      .3*Math.cos(2*Math.PI*i/513),.3*Math.sin(2*Math.PI*i/513),
    ])
    observed.length=0
    await assert.rejects(build(mock(),input),/NATIVE_INTAKE_PRE_NEST_UNSUPPORTED_CUT/)
    assert.equal(observed.filter(op=>op==='grade-run-cutlines').length,2)
  }finally{Object.assign(cut,old)}
  try{
    cut.manufacturerReady=true
    observed.length=0
    await assert.rejects(build(mock(),input),/NATIVE_INTAKE_PRE_NEST_CUT_SOURCE_DRIFT/)
    assert.equal(observed.filter(op=>op==='grade-run-cutlines').length,2)
  }finally{Object.assign(cut,old)}
})

test('same-revision linked graph mutation during late native CUT inspection is refused',async()=>{
  const original=structuredClone(project.native_point_bindings)
  let reads=0
  const normal=mock()
  const racing={request:async packet=>{
    const reply=await normal.request(packet)
    if(packet.op==='grade-run-cutlines'&&++reads===7)
      project.native_point_bindings.active=false
    return reply
  }}
  try{
    await assert.rejects(build(racing,input),
      /NATIVE_INTAKE_SOURCE_CHANGED_DURING_BUILD|NATIVE_PROJECT_CHANGED_DURING_INSPECTION/)
    assert.equal(reads,7)
  }finally{project.native_point_bindings=original}
})
