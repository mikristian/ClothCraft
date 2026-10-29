// Change Length proposal for a Rust PolygonPattern. Coordinates and lengths are metres.
// This helper never commits an edit to a native garment session.
const validPoint = p => Array.isArray(p) && p.length === 2 && p.every(v => typeof v === 'number' && Number.isFinite(v))
const distance = (a,b) => Math.hypot(b[0]-a[0],b[1]-a[1])
const cross = (a,b,c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
const failure = reason => ({ok:false,reason,manufacturingApproved:false})

function intersections(a,b,c,d){
  const ab=[b[0]-a[0],b[1]-a[1]],cd=[d[0]-c[0],d[1]-c[1]]
  const den=ab[0]*cd[1]-ab[1]*cd[0]
  const ca=[c[0]-a[0],c[1]-a[1]]
  if(Math.abs(den)<1e-13){
    if(Math.abs(cross(a,b,c))>1e-10 || Math.abs(cross(a,b,d))>1e-10)return false
    const axis=Math.abs(ab[0])>=Math.abs(ab[1])?0:1
    const min=Math.max(Math.min(a[axis],b[axis]),Math.min(c[axis],d[axis]))
    const max=Math.min(Math.max(a[axis],b[axis]),Math.max(c[axis],d[axis]))
    return max-min>1e-10
  }
  const t=(ca[0]*cd[1]-ca[1]*cd[0])/den
  const u=(ca[0]*ab[1]-ca[1]*ab[0])/den
  return t>1e-10&&t<1-1e-10&&u>1e-10&&u<1-1e-10
}

/**
 * Build an immutable proposal for an unsewn, straight native edge.
 * @param {object} polygon Rust PolygonPattern
 * @param {{edge:string,lengthM:number,mode:'Start'|'End'|'Both',panelId?:string,template?:object}} options
 * Start moves the starting vertex; End moves the ending vertex; Both moves
 * each vertex by half the length difference along the original edge axis.
 * Return {ok,polygon,qa,manufacturingApproved:false}, or {ok:false,reason}.
 */
export function proposeCloNativeChangeLength20261025(polygon,{edge,lengthM,mode='End',panelId,template}={}){
  try{
    const pts=polygon?.points,edges=polygon?.edges
    if(!Array.isArray(pts)||!Array.isArray(edges)||pts.length<3||pts.length>128||pts.length!==edges.length||
      !pts.every(validPoint)||edges.some(x=>typeof x!=='string'||!x)||new Set(edges).size!==edges.length)
      throw Error('Invalid native polygon point or edge topology')
    if(typeof edge!=='string'||!edges.includes(edge))throw Error('Select one existing named edge')
    if(!['Start','End','Both'].includes(mode))throw Error('Mode must be Start, End, or Both')
    if(typeof lengthM!=='number'||!Number.isFinite(lengthM)||lengthM<=1e-6||lengthM>100)
      throw Error('Length must be finite and between 0.000001 and 100 metres')
    const i=edges.indexOf(edge),j=(i+1)%pts.length,prev=edges[(i+pts.length-1)%pts.length],nextEdge=edges[j]
    const oldLength=distance(pts[i],pts[j]);if(!Number.isFinite(oldLength)||oldLength<=1e-6)throw Error('Selected edge is degenerate')
    // A moved vertex also changes its adjoining edge. Do not quietly rewrite
    // spline/free-station geometry or physical seam/marking relationships.
    const affected=new Set([edge,prev,nextEdge])
    for(const name of affected){
      if(polygon.curves?.[name]!==undefined||polygon.free_curve_points?.[name]!==undefined)
        throw Error('Attached cubic or free curve stations require native curve remapping')
      if(polygon.notches?.[name]?.length||polygon.target_lengths?.[name]!==undefined||
        polygon.seam_allowances?.[name]!==undefined)
        throw Error('Attached notch, target length, or seam allowance needs revalidation')
    }
    if(polygon.holes?.length||polygon.lines?.length||polygon.measurements?.length||polygon.annotations?.length)
      throw Error('Internal geometry or measurements require native remapping')
    if(template!==undefined){
      if(!Array.isArray(template?.seams))throw Error('Native template seams must be available')
      if(typeof panelId!=='string'||!panelId)throw Error('Panel ID required for sewing guard')
      if(template.seams.some(seam=>[seam?.a,seam?.b].some(ref=>ref?.panel===panelId&&affected.has(ref?.edge))))
        throw Error('Selected vertex connects to a sewn edge')
    }
    const ux=(pts[j][0]-pts[i][0])/oldLength,uy=(pts[j][1]-pts[i][1])/oldLength
    const delta=lengthM-oldLength
    const moveStart=mode==='Start'?-delta:mode==='Both'?-delta/2:0
    const moveEnd=mode==='End'?delta:mode==='Both'?delta/2:0
    const proposed=structuredClone(polygon)
    proposed.points[i]=[pts[i][0]+ux*moveStart,pts[i][1]+uy*moveStart]
    proposed.points[j]=[pts[j][0]+ux*moveEnd,pts[j][1]+uy*moveEnd]
    if(!proposed.points.every(validPoint))throw Error('Changed coordinates overflow the native metre range')
    const measured=distance(proposed.points[i],proposed.points[j])
    if(!Number.isFinite(measured)||Math.abs(measured-lengthM)>Math.max(1e-9,lengthM*1e-9))
      throw Error('Exact selected edge length could not be preserved')
    const segmentLengths=proposed.points.map((p,k)=>distance(p,proposed.points[(k+1)%pts.length]))
    if(segmentLengths.some(l=>!Number.isFinite(l)||l<=1e-6))throw Error('Result contains a collapsed contour segment')
    const area=proposed.points.reduce((s,p,k)=>s+p[0]*proposed.points[(k+1)%pts.length][1]-p[1]*proposed.points[(k+1)%pts.length][0],0)/2
    if(!Number.isFinite(area)||area<=1e-10)throw Error('Result reverses or collapses the native counterclockwise contour')
    for(let k=0;k<pts.length;k++)for(let m=k+1;m<pts.length;m++){
      if(m===k+1||(k===0&&m===pts.length-1))continue
      if(intersections(proposed.points[k],proposed.points[(k+1)%pts.length],proposed.points[m],proposed.points[(m+1)%pts.length]))
        throw Error('Result has intersecting contour edges')
    }
    return {ok:true,polygon:proposed,edge,mode,manufacturingApproved:false,
      qa:{oldLengthM:oldLength,targetLengthM:lengthM,measuredLengthM:measured,errorM:Math.abs(measured-lengthM),
        movedVertexIndices:mode==='Both'?[i,j]:mode==='Start'?[i]:[j],signedAreaM2:area,
        topologyPreserved:true,pointCount:pts.length,edgeIdsPreserved:true},
      caveat:'Geometry proposal only; native Rust Shape validation and garment simulation must follow.'}
  }catch(error){return failure(error?.message||String(error))}
}

/** UI adapter: accepts start/end/both and returns the proposed polygon. */
export function changeNativeEdgeLength(polygon,edge,targetLengthMetres,location='end'){
  const modes={start:'Start',end:'End',both:'Both'}
  const mode=modes[location]
  if(!mode)throw Error('Change Length location must be start, end, or both')
  const result=proposeCloNativeChangeLength20261025(polygon,{edge,lengthM:targetLengthMetres,mode})
  if(!result.ok)throw Error(result.reason)
  return {polygon:result.polygon,changedVertices:result.qa.movedVertexIndices,qa:result.qa}
}
