import {gradeProject} from './grading.js'
import {gradeAttachedConstructionPoint} from './gradedConstructionAttachments.js'
import {seamAllowanceBoundary,edgeRangeLength} from './project.js'

// Inspect authored manufacturing marks without inventing a cutter protocol.
// A grade-anchored hole is only an evidence snapshot until DXF/AAMA/CUT
// interchange and real material/size receivers independently verify it.
const finite=n=>typeof n==='number'&&Number.isFinite(n)
const safeId=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{1,72}$/.test(s)
const fail=(code,detail=code)=>({ok:false,issues:[{code,detail}],sizes:[],
  machineReady:false,externalCadVerified:false,cuttingAuthorized:false,factoryApproved:false})
const inside=(p,poly)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
 const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes
}return yes}
const anchored=(source,dest,mark)=>{
 const anchor=mark.anchor
 if(Number.isInteger(anchor.vertexIndex)){
  const a=source.points[anchor.vertexIndex],b=dest.points[anchor.vertexIndex]
  if(!a||!b||![a.x,a.y,b.x,b.y].every(finite))throw Error('INVALID_VERTEX_MARK_ANCHOR')
  return {x:b.x+(mark.x-a.x),y:b.y+(mark.y-a.y)}
 }
 if(Number.isInteger(anchor.edgeIndex)){
  if(!finite(anchor.t)||anchor.t<0||anchor.t>1)throw Error('INVALID_EDGE_MARK_STATION')
  // An edge-station mark is a point on the edge itself; for a proper
  // interior hole use an explicit vertex-relative offset instead.
  return gradeAttachedConstructionPoint(source,dest,mark,anchor)
 }
 throw Error('UNSUPPORTED_MARK_ANCHOR')
}
export function inspectIndustrialGradedDrillHoleWitness20261028(project,{seamToleranceCm=.05}={}){
 const sizes=project?.grading?.sizes
 if(!Array.isArray(sizes)||sizes.length<2||sizes.length>24||new Set(sizes).size!==sizes.length||
   !sizes.includes(project.grading.baseSize)||sizes.some(s=>!safeId(s))||
   !Array.isArray(project?.pieces)||!project.pieces.length||!finite(seamToleranceCm)||
   seamToleranceCm<0||seamToleranceCm>1)return fail('INVALID_GRADED_FEATURE_SOURCE')
 const seen=new Set()
 for(const p of project.pieces){
  if(!safeId(p.id)||seen.has(p.id)||!Array.isArray(p.points)||p.points.length<3||p.points.length>512)return fail('INVALID_PIECE')
  seen.add(p.id)
  if(['drillMarks','punches','cutHoles','internalCutouts','internalCuts'].some(k=>p[k]?.length))return fail('UNSUPPORTED_FEATURE_PROTOCOL',p.id)
  for(const mark of p.drills||[]){
   if(!safeId(mark?.id)||!finite(mark.x)||!finite(mark.y)||
      !mark.anchor||!(Number.isInteger(mark.anchor.vertexIndex)||Number.isInteger(mark.anchor.edgeIndex)))
    return fail('UNANCHORED_DRILL',p.id)
  }
  for(const hole of p.holes||[]){
   if(!hole||!safeId(hole.id)||!Array.isArray(hole.vertices)||hole.vertices.length<3||hole.vertices.length>256||
     hole.vertices.some(v=>!safeId(v.id)||!finite(v.x)||!finite(v.y)||
       !v.anchor||!(Number.isInteger(v.anchor.vertexIndex)||Number.isInteger(v.anchor.edgeIndex))))
    return fail('UNANCHORED_INTERNAL_HOLE',p.id)
  }
 }
 try{
  const out=[]
  for(const size of sizes){
   const graded=gradeProject(project,size)
   const pieces=[]
   for(const p of project.pieces){
    const dest=graded.pieces.find(x=>x.id===p.id)
    if(!dest||dest.points.length!==p.points.length)throw Error('GRADED_TOPOLOGY_DRIFT')
    const boundary=seamAllowanceBoundary(dest,12)
    const drills=(p.drills||[]).map(m=>{
     const pt=anchored(p,dest,m)
     if(!inside(pt,boundary))throw Error(`DRILL_OUTSIDE_GRADED_CUT:${p.id}/${m.id}`)
     return {id:m.id,xCm:pt.x,yCm:pt.y,anchor:structuredClone(m.anchor)}
    })
    const holes=(p.holes||[]).map(h=>{
     const vertices=h.vertices.map(v=>anchored(p,dest,v))
     if(vertices.some(v=>!inside(v,boundary))||
       Math.abs(vertices.reduce((sum,v,i)=>sum+v.x*vertices[(i+1)%vertices.length].y-vertices[(i+1)%vertices.length].x*v.y,0))<1e-6)
      throw Error(`INVALID_GRADED_INTERNAL_HOLE:${p.id}/${h.id}`)
     return {id:h.id,verticesCm:vertices}
    })
    pieces.push({pieceId:p.id,drills,holes,cutTopologyPreserved:boundary.length>=3})
   }
   const seams=[]
   for(const seam of project.seams||[]){
    const a=graded.pieces.find(p=>p.id===seam.a?.pieceId),b=graded.pieces.find(p=>p.id===seam.b?.pieceId)
    if(!a||!b)throw Error('MISSING_GRADED_SEAM_PIECE')
    const la=edgeRangeLength(a,seam.a.edgeIndex,seam.a.startT??0,seam.a.endT??1)
    const lb=edgeRangeLength(b,seam.b.edgeIndex,seam.b.startT??0,seam.b.endT??1)
    if(!finite(la)||!finite(lb)||Math.abs(la-lb)>seamToleranceCm)throw Error(`GRADED_SEAM_LENGTH_MISMATCH:${size}/${seam.id}`)
    seams.push({id:seam.id,lengthAcm:la,lengthBcm:lb,mismatchCm:Math.abs(la-lb)})
   }
   out.push({size,pieces,seams})
  }
  return {ok:true,issues:[],sizes:out,drillCount:out.reduce((n,s)=>n+s.pieces.reduce((t,p)=>t+p.drills.length,0),0),
   holeCount:out.reduce((n,s)=>n+s.pieces.reduce((t,p)=>t+p.holes.length,0),0),
   featureExportVerified:false,externalCadVerified:false,machineReady:false,
   cuttingAuthorized:false,factoryApproved:false,
   note:'Size-aware engineering witness only. Generic DXF/AAMA drill, internal-hole and cutter protocols remain blocked.'}
 }catch(e){return fail('GRADED_FEATURE_VERIFICATION_REFUSED',String(e.message||e))}
}
