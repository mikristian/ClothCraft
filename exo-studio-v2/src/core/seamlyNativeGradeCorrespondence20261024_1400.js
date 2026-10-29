// Read-only geometric correspondence for inspected Seamly AAMA CUT outlines.
const refusal = (code, detail) => ({ok:false,code,blockers:[detail],correspondence:[],approved:false,manufacturingApproved:false,nativeRulesCommitted:false,nativeEditsApplied:false,factoryExportAllowed:false})
function snapshot(input) {
  const active=new Set(); let nodes=0
  function copy(value,depth=0){
    if(typeof value==='string'){if(value.length>5000000)throw Error('SOURCE_COMPLEXITY_BUDGET');return value}
    if(value===null||typeof value==='boolean'||typeof value==='number'){
      if(typeof value==='number'&&!Number.isFinite(value))throw Error('INVALID_NUMBER')
      return value
    }
    if(!value||typeof value!=='object')throw Error('UNSAFE_VALUE')
    if(++nodes>15000||depth>64)throw Error('SOURCE_COMPLEXITY_BUDGET')
    if(active.has(value))throw Error('CYCLIC_SOURCE')
    const array=Array.isArray(value),proto=Object.getPrototypeOf(value)
    if(array?proto!==Array.prototype:(proto!==Object.prototype&&proto!==null))throw Error('UNSAFE_OBJECT')
    active.add(value)
    try{
      const descriptors=Object.getOwnPropertyDescriptors(value)
      const keys=Reflect.ownKeys(descriptors)
      if(keys.length>5000)throw Error('SOURCE_COMPLEXITY_BUDGET')
      if(keys.some(k=>typeof k==='symbol'))throw Error('SYMBOL_METADATA_REFUSED')
      const out=array?[]:Object.create(null)
      if(array){
        const length=descriptors.length?.value
        if(!Number.isSafeInteger(length)||length>5000||keys.length!==length+1)throw Error('SPARSE_OR_HIDDEN_ARRAY')
      }
      for(const key of keys){
        const d=descriptors[key]
        if(!Object.hasOwn(d,'value'))throw Error('ACCESSOR_REFUSED')
        if(array&&key==='length')continue
        if(!d.enumerable)throw Error('HIDDEN_METADATA_REFUSED')
        if(key==='__proto__'||key==='prototype'||key==='constructor')throw Error('UNSAFE_KEY')
        if(array&&(!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=descriptors.length.value))throw Error('SPARSE_OR_HIDDEN_ARRAY')
        const copied=copy(d.value,depth+1)
        if(array)out[Number(key)]=copied
        else Object.defineProperty(out,key,{value:copied,enumerable:true,writable:true,configurable:true})
      }
      if(array&&out.length!==descriptors.length.value)throw Error('SPARSE_OR_HIDDEN_ARRAY')
      return out
    }finally{active.delete(value)}
  }
  return copy(input)
}
const metric=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)
function outline(g){
  if(!g||!Array.isArray(g.points)||g.points.length<3||g.points.length>128)throw Error('INVALID_TOPOLOGY')
  const p=g.points
  if(p.some(v=>!v||!Number.isFinite(v.x)||!Number.isFinite(v.y)||Math.abs(v.x)>1e7||Math.abs(v.y)>1e7))throw Error('INVALID_COORDINATES')
  if(p.some((v,i)=>metric(v,p[(i+1)%p.length])<1e-6))throw Error('DEGENERATE_EDGE')
  const signed=p.reduce((s,v,i)=>s+v.x*p[(i+1)%p.length].y-v.y*p[(i+1)%p.length].x,0)/2
  if(Math.abs(signed)<1e-5||!Number.isFinite(signed))throw Error('DEGENERATE_AREA')
  if(g.vertexCount!==undefined&&g.vertexCount!==p.length)throw Error('TOPOLOGY_METADATA_CONFLICT')
  const edges=p.map((v,i)=>({x:p[(i+1)%p.length].x-v.x,y:p[(i+1)%p.length].y-v.y}))
  const perimeter=edges.reduce((s,v)=>s+Math.hypot(v.x,v.y),0)
  const sig=edges.map((v,i)=>{
    const prior=edges[(i+p.length-1)%p.length],a=Math.hypot(prior.x,prior.y),b=Math.hypot(v.x,v.y)
    return {length:b/perimeter,turn:Math.atan2(prior.x*v.y-prior.y*v.x,prior.x*v.x+prior.y*v.y)}
  })
  return {p,sig,signed,perimeter}
}
function candidate(base,target,offset,reverse){
  const n=base.p.length,indices=Array.from({length:n},(_,i)=>reverse?(offset-i+n)%n:(offset+i)%n)
  // Rebuild edge-local signature in traversal order so reversed winding is evaluated consistently.
  const q=indices.map(i=>target.p[i]),edges=q.map((v,i)=>({x:q[(i+1)%n].x-v.x,y:q[(i+1)%n].y-v.y}))
  const perimeter=edges.reduce((s,v)=>s+Math.hypot(v.x,v.y),0)
  let cost=0
  for(let i=0;i<n;i++){
    const v=edges[i],prior=edges[(i+n-1)%n],a=Math.hypot(prior.x,prior.y),b=Math.hypot(v.x,v.y)
    const turn=Math.atan2(prior.x*v.y-prior.y*v.x,prior.x*v.x+prior.y*v.y)
    const delta=Math.atan2(Math.sin(turn-base.sig[i].turn),Math.cos(turn-base.sig[i].turn))
    const lengthDiff=b/perimeter-base.sig[i].length
    cost+=lengthDiff*lengthDiff+delta*delta/(Math.PI*Math.PI*n)
  }
  return {indices,offset,reversed:reverse,score:cost/n}
}
/** Read-only correspondence of original millimetre CUT vertices, no grading rules produced. */
export function inspectSeamlyNativeGradeCorrespondence20261024_1400(input){
  try{
    const run=snapshot(input)
    if(!run||run.ok!==true||run.manufacturingApproved!==false||run.approved!==false||!Array.isArray(run.sizes)||run.sizes.length<2||run.sizes.length>20||!Array.isArray(run.sourceBlocks)||run.sourceBlocks.length<1||run.sourceBlocks.length>128||!run.bySize||typeof run.bySize!=='object'||!['mm','cm','inch'].includes(run.sourceUnit))return refusal('INVALID_INSPECTION','Expected an unapproved multi-size Seamly inspection')
    if(!run.sizes.includes(run.baseSize)||new Set(run.sizes.map(String)).size!==run.sizes.length||new Set(run.sourceBlocks).size!==run.sourceBlocks.length)return refusal('INVALID_INVENTORY','Base size, sizes, or CUT inventory inconsistent')
    let vertices=0,comparisons=0
    const correspondence=[],blockers=[]
    for(const pieceId of run.sourceBlocks){
      if(typeof pieceId!=='string'||!pieceId||pieceId.length>256)return refusal('INVALID_PIECE_ID','Invalid CUT block identifier')
      const baseEntry=run.bySize[String(run.baseSize)]?.[pieceId]
      if(!baseEntry||baseEntry.pieceId!==pieceId)return refusal('INVALID_INVENTORY',`Missing base CUT ${pieceId}`)
      const base=outline(baseEntry.sourceGeometry)
      const rows=[]
      for(const size of run.sizes){
        const entry=run.bySize[String(size)]?.[pieceId]
        if(!entry||entry.pieceId!==pieceId)return refusal('INVALID_INVENTORY',`Missing CUT ${pieceId}/${size}`)
        if(!/^[a-f0-9]{64}$/i.test(entry.sourceSha256||'')||typeof entry.sourceFile!=='string'||!entry.sourceFile.toLowerCase().endsWith('.dxf'))return refusal('INVALID_PROVENANCE',`DXF hash or source missing for ${pieceId}/${size}`)
        const target=outline(entry.sourceGeometry)
        vertices+=target.p.length
        if(vertices>4096)return refusal('SOURCE_COMPLEXITY_BUDGET','More than 4096 source vertices')
        if(target.p.length!==base.p.length){blockers.push(`${pieceId}/${size}: changed vertex topology`);rows.push({size,matched:false,reason:'TOPOLOGY_CHANGED',sourceSha256:entry.sourceSha256,sourceFile:entry.sourceFile});continue}
        const options=[]
        for(let reversal=0;reversal<2;reversal++)for(let offset=0;offset<base.p.length;offset++){
          if(++comparisons>200000)return refusal('SOURCE_COMPLEXITY_BUDGET','Correspondence search exceeds 200000 candidates')
          options.push(candidate(base,target,offset,!!reversal))
        }
        options.sort((a,b)=>a.score-b.score||Number(a.reversed)-Number(b.reversed)||a.offset-b.offset)
        const best=options[0],runner=options[1]
        // Geometric symmetry creates multiple equally valid mappings even if source indices happen to agree.
        if(runner.score-best.score<=1e-10){blockers.push(`${pieceId}/${size}: symmetric or ambiguous vertex correspondence`);rows.push({size,matched:false,reason:'AMBIGUOUS_SYMMETRY',sourceSha256:entry.sourceSha256,sourceFile:entry.sourceFile});continue}
        if(best.score>0.05){blockers.push(`${pieceId}/${size}: shape deformation exceeds correspondence confidence`);rows.push({size,matched:false,reason:'SHAPE_MISMATCH',sourceSha256:entry.sourceSha256,sourceFile:entry.sourceFile});continue}
        rows.push({size,matched:true,sourceSha256:entry.sourceSha256,sourceFile:entry.sourceFile,sourceBlock:entry.sourceBlock,score:best.score,offset:best.offset,reversed:best.reversed,pointIndices:best.indices,pointMovementsFromBaseMm:best.indices.map((j,i)=>({basePointIndex:i,sourcePointIndex:j,dxMm:target.p[j].x-base.p[i].x,dyMm:target.p[j].y-base.p[i].y}))})
      }
      correspondence.push({pieceId,baseSize:run.baseSize,rows})
    }
    return {ok:blockers.length===0,code:blockers.length?'CORRESPONDENCE_BLOCKED':'CORRESPONDENCE_INSPECTED',baseSize:run.baseSize,sourceUnit:run.sourceUnit,geometryUnit:'mm',correspondence,blockers,approved:false,manufacturingApproved:false,nativeRulesCommitted:false,nativeEditsApplied:false,factoryExportAllowed:false}
  }catch(error){return refusal(error?.message||'INVALID_INPUT','Unsafe or invalid inspected source')}
}
