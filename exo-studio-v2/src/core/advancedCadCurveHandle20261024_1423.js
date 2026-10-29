import {gradeProject} from './grading.js'
import {edgeLength, edgePointAt, samplePieceBoundary} from './project.js'

// Authored pattern coordinates are centimetres. Curve edits remain review-only.
const bad = code => { throw Error('ADVANCED_CURVE_'+code) }
const finite = x => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= 100000
const has = (v,k) => Object.prototype.hasOwnProperty.call(v,k)
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y)
const cross = (a,b,c) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
const rectangle = (a,b,p) => p.x>=Math.min(a.x,b.x)-1e-8 && p.x<=Math.max(a.x,b.x)+1e-8 && p.y>=Math.min(a.y,b.y)-1e-8 && p.y<=Math.max(a.y,b.y)+1e-8
function intersect(a,b,c,d){
  const x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),w=cross(c,d,b),eps=1e-8
  if(((x>eps&&y< -eps)||(x< -eps&&y>eps))&&((z>eps&&w< -eps)||(z< -eps&&w>eps)))return true
  return Math.abs(x)<=eps&&rectangle(a,b,c)||Math.abs(y)<=eps&&rectangle(a,b,d)||Math.abs(z)<=eps&&rectangle(c,d,a)||Math.abs(w)<=eps&&rectangle(c,d,b)
}
function snapshot(input){
  const seen=new Set();let nodes=0
  const visit=(v,depth=0)=>{
    if(v===null||typeof v==='string'||typeof v==='boolean')return v
    if(typeof v==='number') {if(!Number.isFinite(v))bad('NONFINITE');return v}
    if(typeof v!=='object'||depth>32||++nodes>16000||seen.has(v))bad('COMPLEXITY')
    const arr=Array.isArray(v)
    if(Object.getPrototypeOf(v)!==(arr?Array.prototype:Object.prototype))bad('PROTOTYPE')
    const desc=Object.getOwnPropertyDescriptors(v),keys=Reflect.ownKeys(desc)
    if(keys.some(k=>typeof k!=='string'||['__proto__','constructor','prototype','toJSON'].includes(k))||arr&&v.length>10000)bad('UNSAFE_PROPERTY')
    const output=arr?[]:{}
    seen.add(v)
    for(const k of keys){
      if(arr&&k==='length')continue
      const d=desc[k]
      if(!has(d,'value')||!d.enumerable||arr&&(!/^(0|[1-9]\d*)$/.test(k)||+k>=v.length))bad('ACCESSOR')
      Object.defineProperty(output,k,{value:visit(d.value,depth+1),enumerable:true,writable:true,configurable:true})
    }
    if(arr&&(output.length!==v.length||Object.keys(output).length!==v.length))bad('SPARSE_ARRAY')
    seen.delete(v)
    return output
  }
  return visit(input)
}
function contour(piece){
  if(!Array.isArray(piece.points)||piece.points.length<3||piece.points.length>64)bad('POINT_LIMIT')
  const curveKeys=Object.keys(piece.curves||{})
  if(curveKeys.length>piece.points.length||curveKeys.some(k=>!/^(0|[1-9]\d*)$/.test(k)||+k>=piece.points.length))bad('CURVE_KEY')
  if(piece.points.some(p=>!finite(p?.x)||!finite(p?.y)))bad('POINT_COORDINATE')
  for(const curve of Object.values(piece.curves||{}))if(!curve||Object.keys(curve).sort().join(',')!=='cx,cy'||!finite(curve.cx)||!finite(curve.cy))bad('CURVE_CONTROL')
  const path=samplePieceBoundary(piece,20).points
  if(path.length>1280||path.length<3||path.some(p=>!finite(p.x)||!finite(p.y)))bad('SAMPLE_LIMIT')
  const origin=path[0]
  let area=0
  for(let i=0;i<path.length;i++){
    const a=path[i],b=path[(i+1)%path.length]
    if(distance(a,b)<1e-7)bad('ZERO_EDGE')
    area+=(a.x-origin.x)*(b.y-origin.y)-(a.y-origin.y)*(b.x-origin.x)
    for(let j=i+2;j<path.length;j++){
      if(i===0&&j===path.length-1)continue
      if(intersect(a,b,path[j],path[(j+1)%path.length]))bad('SELF_INTERSECTION')
    }
  }
  if(Math.abs(area)<1e-6)bad('DEGENERATE_CONTOUR')
  return Math.sign(area)
}
const identity=(piece,id)=>piece&&piece.id===id&&typeof id==='string'&&id.length>0&&id.length<=120
const anchored=(anchor,index)=>anchor?.edgeIndex===index
const relevantSeam=(seam,id,index)=>['a','b'].some(side=>seam?.[side]?.pieceId===id&&seam[side].edgeIndex===index)

/** Editing a quadratic edge control is an actual pattern mutation, with all sizes checked.
 * kind: 'curve.control.set' {cxCm,cyCm} or 'curve.control.move' {dxCm,dyCm}.
 * Unedited coordinates and project source remain immutable. Undo uses the app's history.
 */
export function applyAdvancedCadCurveHandle20261024_1423(source,spec){
  // The underlying grading engine still serializes rule size lists. Reject a
  // poisoned realm before it can dispatch inherited toJSON callbacks.
  if('toJSON' in Object.prototype || 'toJSON' in Array.prototype)bad('UNSAFE_SERIALIZATION_ENVIRONMENT')
  const input=snapshot(source),opts=snapshot(spec)
  const allowedFields=opts?.kind==='curve.control.set'
    ? ['kind','pieceId','edgeIndex','cxCm','cyCm']
    : opts?.kind==='curve.control.move'
      ? ['kind','pieceId','edgeIndex','dxCm','dyCm']
      : null
  if(!allowedFields||Object.keys(opts).some(k=>!allowedFields.includes(k)))bad('SPEC')
  if(!input||!Array.isArray(input.pieces)||input.pieces.length<1||input.pieces.length>24||input.pieces.some(p=>!p||typeof p.id!=='string')||new Set(input.pieces.map(p=>p.id)).size!==input.pieces.length)bad('PIECES')
  if(input.pieces.some(p=>!Array.isArray(p.points)||p.points.length<3||p.points.length>128))bad('PROJECT_GEOMETRY_BUDGET')
  const baseline=snapshot(input)
  const piece=baseline.pieces.find(p=>identity(p,opts.pieceId))
  if(!piece||piece.locked)bad('PIECE_IDENTITY_OR_LOCKED')
  const n=piece.points?.length
  if(!Number.isInteger(opts.edgeIndex)||opts.edgeIndex<0||opts.edgeIndex>=n)bad('EDGE_INDEX')
  const k=opts.edgeIndex
  const unsupportedPiece=['darts','pleats','pins','buttonholes','holes','folds','onFold','foldLine','sewingPairs','edgeBindings','grainline','grainAngle','warpDirection','fabricNap','grainAngleDeg']
  if(unsupportedPiece.some(key=>has(piece,key)))bad('UNSUPPORTED_ATTACHED_GEOMETRY')
  if(input.seams!==undefined&&(!Array.isArray(input.seams)||input.seams.length>200))bad('SEAMS')
  if((input.seams||[]).some(s=>relevantSeam(s,opts.pieceId,k)))bad('SEWN_EDGE_REQUIRES_TRUEING')
  if((input.customMeasurements||[]).some(m=>m?.pieceId===opts.pieceId && (anchored(m.aAnchor,k)||anchored(m.bAnchor,k))))bad('MEASUREMENT_ANCHOR_REQUIRES_REBUILD')
  if(piece.notches!==undefined&&(!Array.isArray(piece.notches)||piece.notches.length>128))bad('NOTCHES')
  if(piece.internalLines!==undefined&&(!Array.isArray(piece.internalLines)||piece.internalLines.length>128))bad('INTERNAL_LINES')
  if(piece.notches?.some(mark=>mark.edgeIndex===k&&mark.gradeArcStation))bad('ARC_LENGTH_NOTCH_REQUIRES_REGRADING')
  if(piece.notches?.some(mark=>mark.edgeIndex===k&&(!finite(mark.t??.5)||(mark.t??.5)<0||(mark.t??.5)>1)))bad('NOTCH_STATION')
  if(piece.internalLines?.some(line=>['a','b'].some(side=>anchored(line[side+'Anchor'],k)&&(!finite(line[side+'Anchor'].t)||line[side+'Anchor'].t<0||line[side+'Anchor'].t>1))))bad('LINE_ANCHOR')
  const oldSign=contour(piece)
  const a=piece.points[k],b=piece.points[(k+1)%n],former=piece.curves?.[k]??{cx:(a.x+b.x)/2,cy:(a.y+b.y)/2}
  const validKeys=opts.kind==='curve.control.set'?['cxCm','cyCm']:['dxCm','dyCm']
  if(!validKeys.every(key=>finite(opts[key])))bad('CONTROL_INPUT')
  const cx=opts.kind==='curve.control.set'?opts.cxCm:former.cx+opts.dxCm
  const cy=opts.kind==='curve.control.set'?opts.cyCm:former.cy+opts.dyCm
  if(!finite(cx)||!finite(cy))bad('CONTROL_COORDINATE')
  if(Math.hypot(cx-former.cx,cy-former.cy)<1e-8)bad('NO_CHANGE')
  if(Math.hypot(cx-(a.x+b.x)/2,cy-(a.y+b.y)/2)>Math.max(300,distance(a,b)*10))bad('EXCESSIVE_CONTROL_OFFSET')
  const next=input
  const target=next.pieces.find(p=>p.id===opts.pieceId)
  target.curves={...(target.curves||{}),[k]:{cx,cy}}
  for(const mark of target.notches||[]){
    if(mark.edgeIndex!==k||(!has(mark,'x')&&!has(mark,'y')))continue
    if(!finite(mark.x)||!finite(mark.y))bad('NOTCH_COORDINATES')
    const originalStation=edgePointAt(piece,k,mark.t??.5)?.point
    if(!originalStation||distance(originalStation,mark)>0.001)bad('STALE_NOTCH_COORDINATES')
    const station=edgePointAt(target,k,mark.t??.5)?.point
    if(!station)bad('NOTCH_REPROJECT')
    mark.x=station.x;mark.y=station.y
  }
  for(const line of target.internalLines||[])for(const end of ['a','b']){
    const anchor=line[end+'Anchor']
    if(!anchored(anchor,k))continue
    const station=edgePointAt(target,k,anchor.t)?.point
    if(!station||!line[end]||!finite(line[end].x)||!finite(line[end].y))bad('LINE_REPROJECT')
    line[end]={...line[end],...station}
  }
  if(contour(target)!==oldSign)bad('CONTOUR_WINDING_CHANGED')
  const sizes=next.grading?.sizes??[next.grading?.baseSize??'M']
  if(!Array.isArray(sizes)||sizes.length<1||sizes.length>12||sizes.some(size=>typeof size!=='string'||!size)||new Set(sizes).size!==sizes.length)bad('SIZE_SET')
  const details=[]
  for(const size of sizes){
    const originalGraded=gradeProject(baseline,size).pieces.find(p=>p.id===opts.pieceId)
    const changed=gradeProject(next,size).pieces.find(p=>p.id===opts.pieceId)
    if(!originalGraded||!changed||contour(changed)!==contour(originalGraded))bad('GRADED_TOPOLOGY')
    const lengthCm=edgeLength(changed,k)
    if(!finite(lengthCm)||lengthCm<0.001)bad('GRADED_LENGTH')
    for(const notch of changed.notches||[])if(notch.edgeIndex===k){
      const station=edgePointAt(changed,k,notch.t??.5)?.point
      if(!station||!finite(station.x)||!finite(station.y))bad('GRADED_NOTCH_STATION')
    }
    details.push({size,previousLengthCm:edgeLength(originalGraded,k),lengthCm,deltaLengthCm:lengthCm-edgeLength(originalGraded,k)})
  }
  next.revision=(Number.isSafeInteger(next.revision)?next.revision:0)+1
  return {project:next,detail:{pieceId:opts.pieceId,edgeIndex:k,oldControl:former,newControl:{cx,cy},wasStraight:!piece.curves?.[k]},
    validation:{units:'cm',sizes:details,sourceUnchanged:true,contours:'validated',cutAndSewnApproval:'pending'},manufacturingApproved:false}
}
