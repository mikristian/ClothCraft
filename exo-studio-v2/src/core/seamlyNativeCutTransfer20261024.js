import {parseSeamlyAamaManufacturingSemantics} from './seamlyAamaManufacturingSemantics20261023.mjs'

// A deliberately narrower, reversible native transfer of ONE Seamly physical
// CUT contour as a new editable polygon. Raw R10 and engineering metadata stay
// in a separate source record. NOT a formula, stitch or grading conversion.
const error=(code,reason)=>({ok:false,code,reason,manufacturingApproved:false})
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
const area=p=>p.reduce((sum,v,i)=>sum+v.x*p[(i+1)%p.length].y-v.y*p[(i+1)%p.length].x,0)/2
function closest(p,a,b) {
 const dx=b.x-a.x,dy=b.y-a.y,div=dx*dx+dy*dy
 const t=div>1e-15?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/div)):0
 return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy))
}
const edgeCross=(a,b,c,d)=>cross(a,b,c)*cross(a,b,d)< -1e-8&&cross(c,d,a)*cross(c,d,b)< -1e-8
function simplify(points,max=64,errorMm=.25){
 const input=points.filter((p,i)=>i===0||Math.hypot(p.x-points[i-1].x,p.y-points[i-1].y)>1e-7)
 if(input.length>3&&Math.hypot(input[0].x-input.at(-1).x,input[0].y-input.at(-1).y)<1e-7)input.pop()
 if(input.length<3)return null
 const out=[...input]
 while(out.length>max) {
   let best=Infinity,index=-1
   for(let i=0;i<out.length;i++){
     const gap=closest(out[i],out[(i+out.length-1)%out.length],out[(i+1)%out.length])
     if(gap<best){best=gap;index=i}
   }
   if(best>errorMm||index<0)return null
   out.splice(index,1)
 }
 const deviation=Math.max(...input.map(p=>Math.min(...out.map((q,i)=>closest(p,q,out[(i+1)%out.length])))))
 const areaLoss=Math.abs(Math.abs(area(out))-Math.abs(area(input)))/Math.abs(area(input))
 if(!Number.isFinite(deviation)||deviation>errorMm+1e-6||areaLoss>.0025)return null
 for(let i=0;i<out.length;i++)for(let j=i+1;j<out.length;j++){
   if(j===i+1||(i===0&&j===out.length-1))continue
   if(edgeCross(out[i],out[(i+1)%out.length],out[j],out[(j+1)%out.length]))return null
 }
 return {points:out,originalVertices:input.length,vertices:out.length,deviationMm:deviation,areaChangeRatio:areaLoss}
}
export function listSeamlyNativeTransferCandidates20261024(file,{unit}={}){
 try {
  if(!file?.content||!file.name?.toLowerCase().endsWith('.dxf')||!(/^[a-f0-9]{64}$/i.test(file.sha256||'')))return error('INVALID_SOURCE','Hashed upstream AAMA DXF required')
  const source=parseSeamlyAamaManufacturingSemantics(file.content,{unit,filename:file.name})
  const pieces=source.pieces.map((p,index)=>{
    const reduction=simplify(p.cutOutlineMm.points,64,.25)
    const warnings=[
      'Only sampled physical CUT points will be editable in native Rust (maximum 64 points).',
      'Original CUT/STITCH association, seams, notches, grainline and internal lines remain in unapproved source metadata.',
      'Editing the imported CUT changes geometry without recalculating the original Seamly construction graph or multi-size grade rules.',
      'Original Seamly DXF retained separately; native garment must not be used as approved manufacturing export.',
    ]
    return {index,name:p.name,eligible:!!reduction,
      ...(reduction||{originalVertices:p.cutOutlineMm.points.length}),
      markers:{notches:p.notches.length,internalCuts:p.internalCuts.length,drawGuides:p.drawPaths.length+(p.sewingContourMm?1:0),grainlines:p.grainline?1:0},
      warnings,sourceBlock:p.provenance.sourceBlock,
    }
  })
  return {ok:true,pieces,unit,filename:file.name,sourceSha256:file.sha256,manufacturingApproved:false}
 }catch(e){return error('PARSE_REJECTED',e.message)}
}
export function buildSeamlyNativeCutCommand20261024(file,{unit,index,fabricId}={}){
 const inspected=listSeamlyNativeTransferCandidates20261024(file,{unit})
 if(!inspected.ok)return inspected
 if(typeof fabricId!=='string'||!fabricId||!Number.isInteger(index)||index<0||index>=inspected.pieces.length)
   return error('INVALID_SELECTION','Choose a valid physical CUT block and an existing native fabric')
 const entry=inspected.pieces[index]
 if(!entry.eligible)return error('UNSUPPORTED_COMPLEX_CUT',entry.name+' exceeds reversible 64-point / 0.25mm native approximation constraints')
 const converted=entry.points
 const xmin=Math.min(...converted.map(p=>p.x)),ymin=Math.min(...converted.map(p=>p.y))
 const command={kind:'Polygon',fabric:fabricId,points:converted.map(p=>[(p.x-xmin)/1000,(p.y-ymin)/1000]),tangents:converted.map(()=>[0,0])}
 return {ok:true,command,index,name:entry.name,
   expectedSourceSha256:file.sha256,unit,sourceBlock:entry.sourceBlock,
   geometryDeviationMm:entry.deviationMm,
   originalVertexCount:entry.originalVertices,nativeVertexCount:entry.vertices,
   originalSourceFile:file.name,markerCounts:entry.markers,
   sourceOnly:true,manufacturingApproved:false,
   warning:'CUT-only native draft, not an approved stitchline, grade transfer or factory cutting pattern'}
}
