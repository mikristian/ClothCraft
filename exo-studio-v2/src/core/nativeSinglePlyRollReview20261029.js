// Explicit operator declarations for a NATIVE Rust CUT-bound, SINGLE-PLY
// digital review. Never infer fabric length, shade, dye lot or defects from
// the browser marker preview. Physical production remains unauthorized.
const safe = value => typeof value==='string'&&
  /^[A-Za-z0-9_-]{1,64}$/.test(value)
const decimal = (value,positive=false) => {
  if(typeof value!=='string'||! /^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,5})?$/.test(value))
    throw Error('INVALID_DECLARED_ROLL_MEASUREMENT')
  const num=Number(value)
  if(!Number.isFinite(num)||(positive?num<=0:num<0))
    throw Error('INVALID_DECLARED_ROLL_MEASUREMENT')
  return num
}
export function parseNativeRollDefects20261029(text) {
  if(typeof text!=='string'||text.length>8192)
    throw Error('INVALID_DECLARED_ROLL_DEFECTS')
  if(text.trim().toLowerCase()==='none')return []
  if(!text.trim())throw Error('EXPLICIT_ROLL_DEFECT_DECLARATION_REQUIRED')
  const results=[]
  for(const span of text.split(',')){
    const parts=span.trim().match(/^([0-9]+(?:\.[0-9]{1,5})?)\s*-\s*([0-9]+(?:\.[0-9]{1,5})?)$/)
    if(!parts||results.length>=200)throw Error('INVALID_DECLARED_ROLL_DEFECTS')
    const startCm=Number(parts[1]),endCm=Number(parts[2])
    if(!Number.isFinite(startCm)||!Number.isFinite(endCm)||
      endCm<=startCm)throw Error('INVALID_DECLARED_ROLL_DEFECTS')
    results.push({startCm,endCm})
  }
  results.sort((a,b)=>a.startCm-b.startCm)
  if(results.some((x,i)=>i>0&&x.startCm<results[i-1].endCm))
    throw Error('OVERLAPPING_DECLARED_ROLL_DEFECTS')
  return results
}

export function prepareNativeSinglePlyRollStudy20261029(source,order,entries) {
  if(!source||!Array.isArray(source.sizes)||!Array.isArray(source.panels)||
    source.revision!==order?.expectedRevision||!entries||
    typeof entries!=='object'||Array.isArray(entries))
    throw Error('NATIVE_ROLL_REVIEW_STALE_SOURCE')
  const panelIds=source.panels.map(panel=>panel.id)
  if(source.sizes.length<1||source.sizes.length>50 ||
    panelIds.length<1||panelIds.length>100 ||
    new Set(source.sizes).size!==source.sizes.length ||
    new Set(panelIds).size!==panelIds.length ||
    source.sizes.some(size=>!safe(size)) ||
    panelIds.some(panel=>!safe(panel)) ||
    !order.quantitiesBySize || typeof order.quantitiesBySize!=='object' ||
    Object.keys(order.quantitiesBySize).length!==source.sizes.length ||
    source.sizes.some(size=>!Object.hasOwn(order.quantitiesBySize,size) ||
      !order.quantitiesBySize[size] ||
      Object.keys(order.quantitiesBySize[size]).length!==panelIds.length ||
      panelIds.some(id=>!Object.hasOwn(order.quantitiesBySize[size],id) ||
        !Number.isSafeInteger(order.quantitiesBySize[size][id]) ||
        order.quantitiesBySize[size][id]<1 ||
        order.quantitiesBySize[size][id]>99)))
    throw Error('NATIVE_ROLL_REVIEW_PHYSICAL_CUT_QUANTITY_MISMATCH')
  const groups=new Map()
  for(const panel of source.panels) {
    const material=order.materialsByPanel?.[panel.id]
    if(!safe(panel.id)||!safe(material?.fabricId)||!safe(material?.groupId)||
      panel.sourceFabricId!==material.fabricId)
      throw Error('NATIVE_ROLL_REVIEW_MATERIAL_MISMATCH')
    const old=groups.get(material.fabricId)
    if(old!==undefined&&old!==material.groupId)
      throw Error('NATIVE_ROLL_REVIEW_MIXED_GROUPS_UNSUPPORTED')
    groups.set(material.fabricId,material.groupId)
  }
  const fabrics=[...groups.keys()]
  if(!fabrics.length||Object.keys(entries).length!==fabrics.length||
    !fabrics.every(fabricId=>Object.hasOwn(entries,fabricId)))
    throw Error('NATIVE_ROLL_REVIEW_INCOMPLETE_FABRICS')
  const rollsById={},defectsByRoll={},assignmentsBySize={}
  for(const fabricId of fabrics){
    const item=entries[fabricId]
    if(!item||typeof item!=='object'||Array.isArray(item)||
      Object.keys(item).sort().join(',')!==
        'availableLengthCm,batchId,defects,dyeLotId,endLossCm,rollId,shadeId,usableWidthCm')
      throw Error('NATIVE_ROLL_REVIEW_INCOMPLETE_DECLARATION')
    const rollId=item.rollId
    if(![rollId,item.shadeId,item.dyeLotId,item.batchId].every(safe)||
      Object.hasOwn(rollsById,rollId))
      throw Error('NATIVE_ROLL_REVIEW_ROLL_IDENTITY')
    rollsById[rollId]={
      fabricId,groupId:groups.get(fabricId),
      usableWidthCm:decimal(item.usableWidthCm,true),
      availableLengthCm:decimal(item.availableLengthCm,true),
      shadeId:item.shadeId,dyeLotId:item.dyeLotId,batchId:item.batchId,
    }
    defectsByRoll[rollId]=parseNativeRollDefects20261029(item.defects)
    for(const size of source.sizes){
      if(!safe(size)||!order.quantitiesBySize?.[size])
        throw Error('NATIVE_ROLL_REVIEW_MISSING_SIZE')
      if(!Object.hasOwn(assignmentsBySize,size))assignmentsBySize[size]={}
      assignmentsBySize[size][fabricId]={rollId,endLossCm:decimal(item.endLossCm)}
    }
  }
  return {rollsById,assignmentsBySize,defectsByRoll}
}
