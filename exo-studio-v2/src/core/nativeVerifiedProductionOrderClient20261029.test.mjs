import assert from 'node:assert/strict'
import test from 'node:test'
import {prepareNativeProductionOrderRequest,summarizeNativeVerifiedOrder,
  verifyNativeProductionOrderResponse20261029,
  summarizeNativeCutIntakeReview20261029}
  from './nativeVerifiedProductionOrderClient20261029.js'

const source={revision:4,sizes:['XS','M','XL'],panels:[
  {id:'front',sourceFabricId:'shell',sourceGrainDegrees:90},
  {id:'back',sourceFabricId:'shell',sourceGrainDegrees:90},
]}
const quantities=()=>Object.fromEntries(source.sizes.map(size=>[size,{front:1,back:2}]))
const materials=()=>({front:{fabricId:'shell',groupId:'shell'},back:{fabricId:'shell',groupId:'shell'}})

test('native order request preserves exact revision, size quantities and declared materials',()=>{
  assert.deepEqual(prepareNativeProductionOrderRequest(source,quantities(),materials()),{
    expectedRevision:4,quantitiesBySize:quantities(),materialsByPanel:materials(),
  })
})
test('native order refuses incomplete size/panel quantities',()=>{
  const qty=quantities();delete qty.M.back
  assert.throws(()=>prepareNativeProductionOrderRequest(source,qty,materials()),/INCOMPLETE_NATIVE_PRODUCTION_QUANTITIES/)
  const sparse=quantities();delete sparse.XL
  assert.throws(()=>prepareNativeProductionOrderRequest(source,sparse,materials()),/INCOMPLETE_NATIVE_PRODUCTION_ORDER/)
})
test('native order refuses altered material, unbounded quantity and client cut payload',()=>{
  const changed=materials();changed.front.fabricId='forged'
  assert.throws(()=>prepareNativeProductionOrderRequest(source,quantities(),changed),/INVALID_NATIVE_PRODUCTION_MATERIAL/)
  const qty=quantities();qty.XL.front=100
  assert.throws(()=>prepareNativeProductionOrderRequest(source,qty,materials()),/INVALID_NATIVE_PRODUCTION_QUANTITY/)
  const extra=materials();extra.back.cut={points:[[0,0]]}
  assert.throws(()=>prepareNativeProductionOrderRequest(source,quantities(),extra),/INVALID_NATIVE_PRODUCTION_MATERIAL/)
})
test('operator cannot submit distinct marker groups sharing one source fabric',()=>{
  const split=materials()
  split.back.groupId='second-roll'
  assert.throws(()=>prepareNativeProductionOrderRequest(source,quantities(),split),
    /DISTINCT_MARKER_GROUPS_REQUIRE_GROUP_AWARE_NATIVE_EXPORT/)
  const matched=materials()
  matched.front.groupId='one-roll'
  matched.back.groupId='one-roll'
  assert.equal(prepareNativeProductionOrderRequest(source,quantities(),matched)
    .materialsByPanel.back.groupId,'one-roll')
})

test('prototype-sensitive size and panel IDs are refused before order map construction',()=>{
  for(const id of ['__proto__','prototype','constructor']){
    assert.throws(()=>prepareNativeProductionOrderRequest(
      {...source,sizes:[id,...source.sizes]},quantities(),materials(),
    ),/INVALID_NATIVE_SOURCE_INSPECTION/)
    assert.throws(()=>prepareNativeProductionOrderRequest(
      {...source,panels:[{id,sourceFabricId:'shell',sourceGrainDegrees:90},...source.panels]},
      quantities(),materials(),
    ),/INVALID_NATIVE_SOURCE_INSPECTION/)
  }
})
test('native verified study never promotes cutting authorization',()=>{
  const verified={workflow:'exo-native-verified-graded-production-order.v1',
    readFromNativeWorkspace:true,sourceMaterialsChecked:true,sourceRevision:4,
    factoryApproved:false,cuttingAuthorized:false,orderQuantities:{XS:{front:2}},
    results:[{cuttingAuthorized:false,markers:[{marker:{ok:true,placements:[{},{}],
      unplaced:[],metrics:{placed:2,requested:2},manufacturingApproved:false}}]}]}
  assert.deepEqual(summarizeNativeVerifiedOrder(verified),{
    sourceRevision:4,sizeCount:1,placements:2,factoryApproved:false,cuttingAuthorized:false,
  })
  assert.throws(()=>summarizeNativeVerifiedOrder({...verified,cuttingAuthorized:true}),/INVALID_NATIVE_ORDER_RESULT/)
  assert.throws(()=>summarizeNativeVerifiedOrder({...verified,results:[{markers:[{marker:{placements:[{}],unusedPieces:1}}]}]}),/INCOMPLETE_NATIVE_VERIFIED_MARKER/)
  for(const change of [
    x=>{x.results[0].markers[0].marker.ok=false},
    x=>{x.results[0].markers[0].marker.unplaced=[{pieceId:'front'}]},
    x=>{x.results[0].markers[0].marker.metrics.requested=3},
    x=>{x.results[0].markers[0].marker.manufacturingApproved=true},
    x=>{x.results[0].cuttingAuthorized=true},
  ]){
    const bad=structuredClone(verified);change(bad)
    assert.throws(()=>summarizeNativeVerifiedOrder(bad),/INCOMPLETE_NATIVE_VERIFIED_MARKER/)
  }
})

test('native GUI independently matches Rust revision, size rows, panel quantities and cutting material',()=>{
  const observed={...source,sourceFingerprint:'a'.repeat(64),
    nativeCutlineFingerprint:'b'.repeat(64)}
  const request=prepareNativeProductionOrderRequest(observed,quantities(),materials())
  const results=observed.sizes.map(size=>({
    size,sourceFingerprint:observed.sourceFingerprint,cuttingAuthorized:false,
    markers:[{fabricId:'shell',marker:{ok:true,placements:[
      {pieceId:'front',instance:0},
      {pieceId:'back',instance:0},
      {pieceId:'back',instance:1},
    ],unplaced:[],manufacturingApproved:false,metrics:{placed:3,requested:3}}}],
  }))
  const reply={workflow:'exo-native-verified-graded-production-order.v1',
    sourceRevision:4,sourceFingerprint:observed.sourceFingerprint,
    nativeCutlineFingerprint:observed.nativeCutlineFingerprint,
    readFromNativeWorkspace:true,sourceMaterialsChecked:true,
    independentlyAuthenticated:false,receivingCadApproved:false,
    orderQuantities:structuredClone(request.quantitiesBySize),
    cuttingMaterialDeclarations:structuredClone(request.materialsByPanel),
    results,cuttingAuthorized:false,factoryApproved:false}
  const check=(data,packet=request)=>{
    return verifyNativeProductionOrderResponse20261029(observed,packet,data)
  }
  assert.deepEqual(check(reply),{
    sourceRevision:4,sizeCount:3,placements:9,
    cuttingAuthorized:false,factoryApproved:false,
  })
  for(const modify of [
    x=>{x.sourceRevision=5},
    x=>{x.sourceFingerprint='changed'},
    x=>{x.nativeCutlineFingerprint='changed'},
    x=>{x.orderQuantities.M.front=2},
    x=>{x.cuttingMaterialDeclarations.back.groupId='wrong'},
    x=>{x.results[1].size='XL'},
    x=>{x.results[0].markers[0].marker.placements[0].pieceId='back'},
    x=>{x.results[0].markers[0].marker.placements.pop()},
    x=>{x.results[0].markers[0].fabricId='wrong'},
    x=>{x.results[0].sourceFingerprint='changed'},
    x=>{x.results[0].markers[0].marker.metrics.requested=4},
    x=>{x.results[0].markers[0].marker.ok=false},
    x=>{x.cuttingAuthorized=true},
    x=>{x.receivingCadApproved=true},
    x=>{x.independentlyAuthenticated=true},
  ]) {
    const bad=structuredClone(reply)
    modify(bad)
    assert.throws(()=>check(bad),/NATIVE_ORDER_|INVALID_NATIVE_ORDER_RESULT|INCOMPLETE_NATIVE_VERIFIED_MARKER/,
      'An altered native order receipt must not be displayed as verified')
  }
  const stale=structuredClone(request)
  stale.expectedRevision=5
  assert.throws(()=>check(reply,stale),/NATIVE_ORDER_SOURCE_OR_RELEASE_MISMATCH/)
  const reordered=structuredClone(reply)
  reordered.cuttingMaterialDeclarations={back:reordered.cuttingMaterialDeclarations.back,
    front:reordered.cuttingMaterialDeclarations.front}
  reordered.orderQuantities={XL:reordered.orderQuantities.XL,
    XS:reordered.orderQuantities.XS,M:reordered.orderQuantities.M}
  assert.deepEqual(check(reordered),check(reply),'object property order must not change physical identity')
})

test('native CUT-intake operator review matches all-size physical quantities, units, source and fail-closed claims',()=>{
  const observed={...source,sourceFingerprint:'a'.repeat(64),
    nativeCutlineFingerprint:'b'.repeat(64)}
  const request=prepareNativeProductionOrderRequest(observed,quantities(),materials())
  const perPanel=(size)=>observed.panels.map(panel=>({
    panelId:panel.id,fabricId:panel.sourceFabricId,
    sourceGrainDegrees:panel.sourceGrainDegrees,groupId:'shell',
    physicalCutCount:request.quantitiesBySize[size][panel.id],
    physicalAreaCm2:200,physicalPerimeterCm:60,
    allowanceEdges:[{name:'a'},{name:'b'},{name:'c'}],
    notchMarksCm:[],notchToMarkerTransferVerified:false,
    notchStationFromSewlineIndependentlyVerified:false,
    outlineCm:[{x:0,y:0},{x:20,y:0},{x:0,y:20}],
  }))
  const study={ok:true,status:'NATIVE_RUST_2D_CUT_INTAKE_SOURCE_INSPECTED',
    manifestSha256:'c'.repeat(64),manifest:{
      format:'exo-native-rust-graded-cut-intake.v1',schemaVersion:1,
      sourceRevision:4,sourceFingerprint:observed.sourceFingerprint,
      nativeCutlineFingerprint:observed.nativeCutlineFingerprint,
      coordinateContract:{rustCutline:'m',normalizedCutline:'cm',metresToCentimetres:100},
      sizes:[...source.sizes],sourcePanels:structuredClone(source.panels),
      quantitiesBySize:structuredClone(request.quantitiesBySize),
      materialsByPanel:structuredClone(request.materialsByPanel),
      sizeCuts:source.sizes.map(size=>({size,panels:perPanel(size)})),
      verifiedPhysicalCutInstances:9,
      cuttingAuthorized:false,factoryApproved:false,manufacturingApproved:false,
      licensedReceiverVerified:false,jsIndustrialProjectSourceMatched:false,
      fabricRollVerified:false,
    }}
  const checked={ok:true,status:'NATIVE_RUST_2D_CUT_INTAKE_REINSPECTED',
    manifestSha256:study.manifestSha256,sizeCount:3,physicalCutCount:9,
    cuttingAuthorized:false,factoryApproved:false}
  assert.deepEqual(summarizeNativeCutIntakeReview20261029(observed,request,study,checked),{
    sizeCount:3,panelCount:2,physicalPieces:9,notchRecords:0,
    totalCutAreaCm2:1800,cuttingAuthorized:false,factoryApproved:false,
    notchToMarkerTransferVerified:false,
  })
  for(const mutate of [
    x=>{x.manifest.sourceRevision=3},
    x=>{x.manifest.sourceFingerprint='bad'},
    x=>{x.manifest.coordinateContract.metresToCentimetres=10},
    x=>{x.manifest.cuttingAuthorized=true},
    x=>{x.manifest.licensedReceiverVerified=true},
    x=>{x.manifest.jsIndustrialProjectSourceMatched=true},
    x=>{x.manifest.sizeCuts[0].panels[0].physicalCutCount=3},
    x=>{x.manifest.sizeCuts[0].panels[0].notchToMarkerTransferVerified=true},
    x=>{x.manifest.sizeCuts[0].panels[0].groupId='OTHER'},
    x=>{x.manifest.sizeCuts[1].size='OTHER'},
  ]){
    const altered=structuredClone(study)
    mutate(altered)
    assert.throws(()=>summarizeNativeCutIntakeReview20261029(
      observed,request,altered,checked),/NATIVE_CUT_INTAKE_/)
  }
  const staleInspection={...checked,manifestSha256:'0'.repeat(64)}
  assert.throws(()=>summarizeNativeCutIntakeReview20261029(
    observed,request,study,staleInspection),/NATIVE_CUT_INTAKE_SOURCE_OR_RELEASE_MISMATCH/)
})
