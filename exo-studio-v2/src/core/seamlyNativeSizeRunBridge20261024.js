import {parseSeamlyAamaManufacturingSemantics} from './seamlyAamaManufacturingSemantics20261023.mjs'
import {listSeamlyNativeTransferCandidates20261024} from './seamlyNativeCutTransfer20261024.js'

const units=new Set(['mm','cm','inch'])
const fail=(code,reason)=>({ok:false,code,reason,manufacturingApproved:false,approved:false})
const normalize=name=>String(name).normalize('NFKC').trim().replace(/\s+/g,' ').toUpperCase()
const area=points=>points.reduce((s,p,i)=>s+p.x*points[(i+1)%points.length].y-p.y*points[(i+1)%points.length].x,0)/2
const orient=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)
function validShape(points) {
 if(!Array.isArray(points)||points.length<3||points.length>100000||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.abs(p.x)>1e7||Math.abs(p.y)>1e7))return null
 const raw=points.map(p=>({x:p.x,y:p.y}))
 if(raw.length>3&&distance(raw[0],raw.at(-1))<1e-7)raw.pop()
 if(raw.length<3||raw.some((p,i)=>distance(p,raw[(i+1)%raw.length])<1e-6))return null
 const signedArea=area(raw)
 if(!Number.isFinite(signedArea)||Math.abs(signedArea)<1e-4)return null
 for(let i=0;i<raw.length;i++)for(let j=i+1;j<raw.length;j++){
  if(j===i+1||(i===0&&j===raw.length-1))continue
  const a=raw[i],b=raw[(i+1)%raw.length],c=raw[j],d=raw[(j+1)%raw.length]
  const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b)
  if((o1*o2<0&&o3*o4<0)||
    (Math.abs(o1)<1e-7&&Math.min(a.x,b.x)-1e-7<=c.x&&c.x<=Math.max(a.x,b.x)+1e-7&&Math.min(a.y,b.y)-1e-7<=c.y&&c.y<=Math.max(a.y,b.y)+1e-7)||
    (Math.abs(o2)<1e-7&&Math.min(a.x,b.x)-1e-7<=d.x&&d.x<=Math.max(a.x,b.x)+1e-7&&Math.min(a.y,b.y)-1e-7<=d.y&&d.y<=Math.max(a.y,b.y)+1e-7))return null
 }
 const xs=raw.map(p=>p.x),ys=raw.map(p=>p.y)
 const bounds={minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)}
 if(bounds.maxX-bounds.minX<.001||bounds.maxY-bounds.minY<.001)return null
 return {points:raw,areaMm2:Math.abs(signedArea),signedAreaMm2:signedArea,bounds,vertexCount:raw.length}
}
const digestHex=bytes=>Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('')

/** Audits a real multi-size upstream Seamly result. Returns inspectable, uncommitted CUT-only polygons. */
export async function inspectSeamlyNativeSizeRun20261024(result,{sourceUnit,baseSize, fabricId, maxRelativeAreaStep=.5}={}, {subtle=globalThis.crypto?.subtle}={}) {
 try {
  if(!units.has(sourceUnit))return fail('SOURCE_UNIT_REQUIRED','Explicit sourceUnit mm, cm, or inch is required')
  if(!subtle||typeof subtle.digest!=='function')return fail('SHA256_UNAVAILABLE','SHA-256 implementation required')
  if(result?.ok!==true||result.engine!=='Seamly2D'||result.format!=='aama-r10'||result.manufacturingApproved!==false||
    !Array.isArray(result.artifacts)||!Array.isArray(result.sizesCm)||result.artifacts.length!==result.sizesCm.length||
    result.artifacts.length<2||result.artifacts.length>20)return fail('INVALID_RUN','Real unapproved Seamly2D multi-size AAMA artifacts required')
  if(!Number.isFinite(maxRelativeAreaStep)||maxRelativeAreaStep<0||maxRelativeAreaStep>1)return fail('INVALID_TOLERANCE','Area-step limit must be between zero and one')
  const seen=new Set(), sizes=[], sources=Object.create(null), perSize=Object.create(null)
  for(let i=0;i<result.artifacts.length;i++){
   const a=result.artifacts[i], size=a?.sizeCm, label=String(size)
   if((typeof size!=='number'&&typeof size!=='string')||!label.trim()||!/^[\w.-]{1,32}$/.test(label)||
      !result.sizesCm.some(v=>v===size)||seen.has(label.toLocaleLowerCase('en-US')))
      return fail('SIZE_COLLISION','Missing, unknown or case-insensitively duplicate size')
   seen.add(label.toLocaleLowerCase('en-US'))
   if(typeof a.content!=='string'||!/\.dxf$/i.test(a.name||'')||! /^[a-f0-9]{64}$/i.test(a.sha256||''))
      return fail('INVALID_ARTIFACT','DXF content, filename and original SHA-256 required')
   if(a.localInspection?.sourceUnit && a.localInspection.sourceUnit!==sourceUnit)return fail('UNIT_CONFLICT','Artifact and selected units differ')
   const bytes=new TextEncoder().encode(a.content)
   const actual=digestHex(await subtle.digest('SHA-256',bytes))
   if(actual!==a.sha256.toLowerCase()||(a.sizeBytes!=null&&a.sizeBytes!==bytes.length))return fail('HASH_MISMATCH','Original DXF bytes do not match SHA-256 and byte count')
   const parsed=parseSeamlyAamaManufacturingSemantics(a.content,{unit:sourceUnit,filename:a.name})
   const inspected=listSeamlyNativeTransferCandidates20261024(a,{unit:sourceUnit})
   if(!inspected.ok||inspected.pieces.length!==parsed.pieces.length)return fail('TRANSFER_REFUSED','Native CUT-only inspection refused this DXF')
   const pieces=Object.create(null)
   for(let j=0;j<parsed.pieces.length;j++){
    const piece=parsed.pieces[j], id=normalize(piece.provenance.sourceBlock)
    if(!id||Object.hasOwn(pieces,id))return fail('PIECE_COLLISION',`Duplicate normalized CUT block in size ${label}: ${id}`)
    const geometry=validShape(piece.cutOutlineMm.points)
    if(!geometry)return fail('INVALID_CUT',`Invalid, degenerate or self-intersecting CUT: ${label}/${id}`)
    const candidate=inspected.pieces[j]
    if(!candidate.eligible)return fail('RECONSTRUCTION_REFUSED',`Native 64-point / 0.25-mm approximation refused: ${label}/${id}`)
    const native=validShape(candidate.points)
    if(!native||candidate.vertices>64||candidate.deviationMm>.25||candidate.areaChangeRatio>.0025)return fail('RECONSTRUCTION_REFUSED',`Native geometry proof refused: ${label}/${id}`)
    const x=native.bounds.minX,y=native.bounds.minY
    pieces[id]={pieceId:id,sourceBlock:piece.provenance.sourceBlock,sourceIndex:j,sourceGeometry:geometry,
      sourceMetadata:{notches:piece.notches.length,internalCuts:piece.internalCuts.length,drawGuides:piece.drawPaths.length+(piece.sewingContourMm?1:0),grainlines:piece.grainline?1:0},
      reconstruction:{deviationMm:candidate.deviationMm,areaChangeRatio:candidate.areaChangeRatio,sourceVertices:candidate.originalVertices,nativeVertices:candidate.vertices},
      nativeProposal:{kind:'Polygon',fabric:typeof fabricId==='string'&&fabricId.length?fabricId:null,
       points:candidate.points.map(p=>[(p.x-x)/1000,(p.y-y)/1000]),tangents:candidate.points.map(()=>[0,0])},
      nativeOriginMm:{x,y},sourceSha256:actual,sourceFile:a.name}
   }
   sizes.push(size)
   sources[label]={filename:a.name,sha256:actual,byteLength:bytes.length,sourceUnit,originalDxfText:a.content,
     originalBlocks:parsed.pieces.map(p=>({name:p.provenance.sourceBlock,index:p.provenance.insertIndex,transform:p.provenance.transform}))}
   perSize[label]=pieces
  }
  if(seen.size!==result.sizesCm.length)return fail('SIZE_MISSING','Size inventory does not match run declaration')
  const base=baseSize===undefined?sizes[0]:baseSize
  if(!sizes.some(s=>s===base))return fail('BASE_SIZE_MISSING','Chosen base size is absent')
  const reference=Object.keys(perSize[String(base)]).sort()
  for(const size of sizes)if(JSON.stringify(Object.keys(perSize[String(size)]).sort())!==JSON.stringify(reference))
    return fail('INVENTORY_MISMATCH',`CUT block inventory differs at size ${size}`)
  const gradeInspector=Object.create(null), blockers=[]
  for(const id of reference){
   const origin=perSize[String(base)][id].sourceGeometry
   const rows=[]
   for(const size of sizes){
    const entry=perSize[String(size)][id],g=entry.sourceGeometry, ratio=g.areaMm2/origin.areaMm2
    const compatible=g.vertexCount===origin.vertexCount&&Math.sign(g.signedAreaMm2)===Math.sign(origin.signedAreaMm2)
    const movement=compatible?g.points.map((p,i)=>({pointIndex:i,dxMm:p.x-origin.points[i].x,dyMm:p.y-origin.points[i].y})):null
    if(!compatible)blockers.push(`${id}/${size}: topology, winding or point correspondence differs; movement mapping unavailable`)
    if(Math.abs(ratio-1)>maxRelativeAreaStep)blockers.push(`${id}/${size}: CUT area differs from base by over ${maxRelativeAreaStep*100}%`)
    rows.push({size,areaMm2:g.areaMm2,relativeAreaToBase:ratio,boundsMm:g.bounds,sourceVertices:g.vertexCount,
      sourceBlock:entry.sourceBlock,sourceSha256:entry.sourceSha256,pointMovementsFromBaseMm:movement,
      nativeProposal:entry.nativeProposal,reconstruction:entry.reconstruction})
   }
   gradeInspector[id]={baseSize:base,rows}
  }
  return {ok:true,sourceUnit,baseSize:base,sizes,sourceBlocks:reference,originalSources:sources,bySize:perSize,
    gradeInspector,blockers,approved:false,manufacturingApproved:false,factoryExportAllowed:false,
    nativeRulesCommitted:false,nativeEditsApplied:false,
    warning:'Engineering inspector and separate native CUT-only draft proposals. Source geometry and construction semantics remain authoritative; no Rust grade rules, factory or physical samples approved.'}
 }catch(e){return fail('PARSE_REJECTED',String(e?.message||e))}
}
