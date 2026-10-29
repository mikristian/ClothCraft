/** Browser-side request builder for the trusted native order endpoint.
 * Never accepts caller CUT geometry or authorizes physical cutting.
 */
const safe = v => typeof v === 'string' && v.trim() === v && v.length > 0 && v.length <= 96 &&
  !['__proto__','prototype','constructor'].includes(v) && !/[\u0000-\u001f\u007f<>]/.test(v)
const sha = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v)
const exactRecord=(value,keys)=>value!==null&&typeof value==='object'&&
  !Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value))&&
  Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key))
const matchingRecord=(actual,expected)=>exactRecord(actual,Object.keys(expected))&&
  Object.keys(expected).every(key=>actual[key]===expected[key])

export function prepareNativeProductionOrderRequest(source, quantitiesBySize, materialsByPanel) {
  if (!source || !Number.isSafeInteger(source.revision) || source.revision < 0 ||
      !Array.isArray(source.sizes) || !source.sizes.length ||
      !Array.isArray(source.panels) || !source.panels.length) throw Error('INVALID_NATIVE_SOURCE_INSPECTION')
  const sizes=source.sizes, ids=source.panels.map(panel=>panel.id)
  if (sizes.length>50||ids.length>100||
      new Set(sizes).size !== sizes.length || new Set(ids).size !== ids.length ||
      sizes.some(size=>!safe(size)) || source.panels.some(panel=>!safe(panel.id)||!safe(panel.sourceFabricId)||!Number.isFinite(panel.sourceGrainDegrees)))
    throw Error('INVALID_NATIVE_SOURCE_INSPECTION')
  if (!exactRecord(quantitiesBySize,sizes)||!exactRecord(materialsByPanel,ids))
    throw Error('INCOMPLETE_NATIVE_PRODUCTION_ORDER')
  const quantities={}
  for (const size of sizes) {
    const entries=quantitiesBySize[size]
    if (!exactRecord(entries,ids))
      throw Error('INCOMPLETE_NATIVE_PRODUCTION_QUANTITIES')
    quantities[size]={}
    for (const id of ids) {
      const count=Object.getOwnPropertyDescriptor(entries,id)
      if (!count || !Object.hasOwn(count,'value') || !Number.isSafeInteger(count.value) || count.value < 1 || count.value > 99)
        throw Error('INVALID_NATIVE_PRODUCTION_QUANTITY')
      quantities[size][id]=count.value
    }
  }
  const materials={}
  const groupByFabric=new Map()
  for (const panel of source.panels) {
    const item=materialsByPanel[panel.id]
    if (!exactRecord(item,['fabricId','groupId']) ||
        item.fabricId !== panel.sourceFabricId || !safe(item.groupId))
      throw Error('INVALID_NATIVE_PRODUCTION_MATERIAL')
    const priorGroup=groupByFabric.get(item.fabricId)
    // Native marker files are currently partitioned by fabric. Distinct
    // groups of one fabric cannot be represented without merging their CUTs.
    if(priorGroup!==undefined&&priorGroup!==item.groupId)
      throw Error('DISTINCT_MARKER_GROUPS_REQUIRE_GROUP_AWARE_NATIVE_EXPORT')
    groupByFabric.set(item.fabricId,item.groupId)
    materials[panel.id]={fabricId:panel.sourceFabricId,groupId:item.groupId}
  }
  return {expectedRevision:source.revision,quantitiesBySize:quantities,materialsByPanel:materials}
}

export function summarizeNativeVerifiedOrder(result) {
  if (result?.workflow !== 'exo-native-verified-graded-production-order.v1' ||
      result.readFromNativeWorkspace !== true || result.sourceMaterialsChecked !== true ||
      result.factoryApproved !== false || result.cuttingAuthorized !== false ||
      !Array.isArray(result.results) || !result.results.length) throw Error('INVALID_NATIVE_ORDER_RESULT')
  if(!Number.isSafeInteger(result.sourceRevision)||result.sourceRevision<0||
     !result.orderQuantities||typeof result.orderQuantities!=='object'||Array.isArray(result.orderQuantities)||
     Object.keys(result.orderQuantities).length!==result.results.length)
    throw Error('INVALID_NATIVE_ORDER_RESULT')
  const sizeCount=result.results.length
  let placements=0
  for(const row of result.results){
    if(!row||row.cuttingAuthorized!==false||!Array.isArray(row.markers)||!row.markers.length)
      throw Error('INCOMPLETE_NATIVE_VERIFIED_MARKER')
    for(const group of row.markers){
      if(!Array.isArray(group?.marker?.placements)||!group.marker.placements.length||
         group.marker.ok!==true||group.marker.manufacturingApproved!==false||
         !Array.isArray(group.marker.unplaced)||group.marker.unplaced.length||
         group.marker.metrics?.placed!==group.marker.placements.length||
         group.marker.metrics?.requested!==group.marker.placements.length)
        throw Error('INCOMPLETE_NATIVE_VERIFIED_MARKER')
      placements+=group.marker.placements.length
    }
  }
  return {sourceRevision:result.sourceRevision,sizeCount,placements,cuttingAuthorized:false,factoryApproved:false}
}

/** Client-side corroboration ONLY. The Rust server remains authoritative.
 * This prevents the GUI from presenting a mismatched size, material or source
 * as the exact order the operator submitted. It cannot authenticate the native
 * service or approve a cutter.
 */
export function verifyNativeProductionOrderResponse20261029(source,request,result) {
  if (!source || !request || !result ||
    !Number.isSafeInteger(source.revision) ||
    result.sourceRevision !== source.revision ||
    request.expectedRevision !== source.revision ||
    !sha(source.sourceFingerprint) ||
    !sha(source.nativeCutlineFingerprint) ||
    result.sourceFingerprint !== source.sourceFingerprint ||
    result.nativeCutlineFingerprint !== source.nativeCutlineFingerprint ||
    result.receivingCadApproved !== false ||
    result.independentlyAuthenticated !== false ||
    result.cuttingAuthorized !== false || result.factoryApproved !== false)
    throw Error('NATIVE_ORDER_SOURCE_OR_RELEASE_MISMATCH')
  const summary = summarizeNativeVerifiedOrder(result)
  const sizes=source.sizes,panels=source.panels
  if(!Array.isArray(sizes)||!Array.isArray(panels)||
    !request.quantitiesBySize||!request.materialsByPanel||
    !exactRecord(result.orderQuantities,sizes) ||
    !exactRecord(result.cuttingMaterialDeclarations,panels.map(panel=>panel.id)) ||
    result.results.length!==sizes.length ||
    result.results.some((r,i)=>r.size!==sizes[i]||r.sourceFingerprint!==source.sourceFingerprint))
    throw Error('NATIVE_ORDER_QUANTITY_OR_SIZE_MISMATCH')
  for(const size of sizes){
    const reported=result.orderQuantities[size]
    const expected=request.quantitiesBySize[size]
    if(!matchingRecord(reported,expected))throw Error('NATIVE_ORDER_QUANTITY_OR_SIZE_MISMATCH')
  }
  for(const panel of panels){
    if(!matchingRecord(result.cuttingMaterialDeclarations[panel.id],
      request.materialsByPanel[panel.id]))
      throw Error('NATIVE_ORDER_QUANTITY_OR_SIZE_MISMATCH')
  }
  let count=0
  for(let i=0;i<sizes.length;i++){
    const row=result.results[i]
    const expected=new Set()
    for(const panel of panels){
      const qty=request.quantitiesBySize[sizes[i]]?.[panel.id]
      if(!Number.isSafeInteger(qty)||qty<1||qty>99)
        throw Error('NATIVE_ORDER_QUANTITY_OR_SIZE_MISMATCH')
      for(let k=0;k<qty;k++)expected.add(JSON.stringify([panel.id,k]))
    }
    for(const group of row.markers){
      if(!group||!safe(group.fabricId)||
        !Array.isArray(group.marker?.placements))
        throw Error('NATIVE_ORDER_MARKER_IDENTITY_MISMATCH')
      for(const placed of group.marker.placements){
        const panel=panels.find(p=>p.id===placed?.pieceId)
        const key=JSON.stringify([placed?.pieceId,placed?.instance])
        if(!panel||group.fabricId!==request.materialsByPanel[panel.id]?.fabricId||
          !Number.isSafeInteger(placed.instance)||placed.instance<0||
          !expected.delete(key))
          throw Error('NATIVE_ORDER_MARKER_IDENTITY_MISMATCH')
        count++
      }
    }
    if(expected.size)throw Error('NATIVE_ORDER_MARKER_IDENTITY_MISMATCH')
  }
  if(count!==summary.placements)
    throw Error('NATIVE_ORDER_MARKER_IDENTITY_MISMATCH')
  return summary
}

/**
 * UI corroboration of the Rust-source-bound CUT intake and its independent
 * server reinspection. This checks operator quantities, geometry metadata,
 * units and fail-closed claims; only the server can rebuild trusted polygons.
 * Never a certificate of native↔JS parity or physical manufacturing approval.
 */
export function summarizeNativeCutIntakeReview20261029(source,request,study,reinspection) {
  const m=study?.manifest
  if(study?.ok!==true||
    study.status!=='NATIVE_RUST_2D_CUT_INTAKE_SOURCE_INSPECTED'||
    !sha(study.manifestSha256)||!m||
    m.format!=='exo-native-rust-graded-cut-intake.v1'||m.schemaVersion!==1||
    reinspection?.ok!==true||
    reinspection.status!=='NATIVE_RUST_2D_CUT_INTAKE_REINSPECTED'||
    reinspection.manifestSha256!==study.manifestSha256||
    reinspection.cuttingAuthorized!==false||reinspection.factoryApproved!==false||
    m.cuttingAuthorized!==false||m.factoryApproved!==false||
    m.manufacturingApproved!==false||m.licensedReceiverVerified!==false||
    m.jsIndustrialProjectSourceMatched!==false||m.fabricRollVerified!==false||
    m.sourceRevision!==source?.revision||request?.expectedRevision!==source?.revision||
    m.sourceFingerprint!==source?.sourceFingerprint||
    m.nativeCutlineFingerprint!==source?.nativeCutlineFingerprint||
    m.coordinateContract?.rustCutline!=='m'||
    m.coordinateContract?.normalizedCutline!=='cm'||
    m.coordinateContract?.metresToCentimetres!==100)
    throw Error('NATIVE_CUT_INTAKE_SOURCE_OR_RELEASE_MISMATCH')
  const sizes=source.sizes,panels=source.panels
  if(!Array.isArray(sizes)||!Array.isArray(panels)||
    !Array.isArray(m.sizes)||!Array.isArray(m.sizeCuts)||
    m.sizes.length!==sizes.length||m.sizeCuts.length!==sizes.length||
    m.sizes.some((s,i)=>s!==sizes[i])||
    !exactRecord(m.quantitiesBySize,sizes)||
    !exactRecord(m.materialsByPanel,panels.map(p=>p.id))||
    !Array.isArray(m.sourcePanels)||m.sourcePanels.length!==panels.length)
    throw Error('NATIVE_CUT_INTAKE_SIZE_OR_PANEL_MISMATCH')
  for(const panel of panels){
    if(!m.sourcePanels.some(p=>p.id===panel.id&&
      p.sourceFabricId===panel.sourceFabricId&&
      p.sourceGrainDegrees===panel.sourceGrainDegrees)||
      !matchingRecord(m.materialsByPanel[panel.id],request.materialsByPanel[panel.id]))
      throw Error('NATIVE_CUT_INTAKE_SIZE_OR_PANEL_MISMATCH')
  }
  let physicalPieces=0,notchRecords=0,totalCutAreaCm2=0
  for(let i=0;i<sizes.length;i++){
    const row=m.sizeCuts[i]
    if(row?.size!==sizes[i]||!Array.isArray(row.panels)||
      row.panels.length!==panels.length||
      !matchingRecord(m.quantitiesBySize[sizes[i]],request.quantitiesBySize[sizes[i]]))
      throw Error('NATIVE_CUT_INTAKE_QUANTITY_DRIFT')
    const seen=new Set()
    for(const part of row.panels){
      const panel=panels.find(p=>p.id===part.panelId)
      if(!panel||seen.has(part.panelId)||
        part.fabricId!==panel.sourceFabricId||
        part.sourceGrainDegrees!==panel.sourceGrainDegrees||
        part.groupId!==request.materialsByPanel[panel.id]?.groupId||
        part.physicalCutCount!==request.quantitiesBySize[sizes[i]]?.[panel.id]||
        !Number.isFinite(part.physicalAreaCm2)||part.physicalAreaCm2<=0||
        !Number.isFinite(part.physicalPerimeterCm)||part.physicalPerimeterCm<=0||
        !Array.isArray(part.outlineCm)||part.outlineCm.length<3||
        !Array.isArray(part.allowanceEdges)||part.allowanceEdges.length<3||
        !Array.isArray(part.notchMarksCm)||
        part.notchToMarkerTransferVerified!==false||
        part.notchStationFromSewlineIndependentlyVerified!==false)
        throw Error('NATIVE_CUT_INTAKE_QUANTITY_DRIFT')
      seen.add(part.panelId)
      physicalPieces+=part.physicalCutCount
      totalCutAreaCm2+=part.physicalAreaCm2*part.physicalCutCount
      notchRecords+=part.notchMarksCm.length
    }
    if(seen.size!==panels.length)throw Error('NATIVE_CUT_INTAKE_QUANTITY_DRIFT')
  }
  if(physicalPieces!==m.verifiedPhysicalCutInstances||
    physicalPieces!==reinspection.physicalCutCount||
    reinspection.sizeCount!==sizes.length)
    throw Error('NATIVE_CUT_INTAKE_QUANTITY_DRIFT')
  return {sizeCount:sizes.length,panelCount:panels.length,
    physicalPieces,notchRecords,totalCutAreaCm2,
    cuttingAuthorized:false,factoryApproved:false,
    notchToMarkerTransferVerified:false}
}
